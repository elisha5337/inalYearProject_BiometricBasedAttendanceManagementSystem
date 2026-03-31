import logging
import numpy as np
from threading import Lock
from .models import BiometricTemplate, User

logger = logging.getLogger(__name__)

class BiometricRegistry:
    """
    Unified, thread-safe high-performance registry for face recognition.
    Optimized for institutional scale at HU-IOT.
    """
    _instance = None
    _lock = Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(BiometricRegistry, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.embeddings_matrix = None
        self.user_data = []
        self.load_lock = Lock()
        self.reload_cache()
        self._initialized = True

    def reload_cache(self):
        """Reloads and pre-normalizes all active face templates."""
        with self.load_lock:
            try:
                templates = BiometricTemplate.objects.filter(
                    type=BiometricTemplate.BiometricType.FACE,
                    user__status=User.Status.ACTIVE
                ).select_related('user')

                if not templates.exists():
                    self.embeddings_matrix = None
                    self.user_data = []
                    return False

                self.user_data = [
                    {'id': str(t.user.id), 'username': t.user.username}
                    for t in templates
                ]

                # Pre-calculate normalized matrix for O(1) matching performance
                embeddings = [np.array(t.template_data) for t in templates]
                matrix = np.array(embeddings)
                
                norms = np.linalg.norm(matrix, axis=1, keepdims=True)
                norms[norms == 0] = 1.0 # Protect against zero vectors
                self.embeddings_matrix = matrix / norms

                logger.info(f"BiometricRegistry: Synchronized {len(self.user_data)} templates.")
                return True
            except Exception as e:
                logger.error(f"BiometricRegistry: Load error: {e}")
                return False

    def find_match(self, query_embedding, threshold=0.75):
        """Vectorized cosine similarity matching."""
        if self.embeddings_matrix is None or not self.user_data:
            return None, 1.0

        try:
            q = np.array(query_embedding)
            q_norm = np.linalg.norm(q)
            if q_norm == 0: return None, 1.0
            
            # Dot product of normalized vectors = Cosine Similarity
            similarities = np.dot(self.embeddings_matrix, q / q_norm)
            distances = 1 - similarities
            
            best_idx = np.argmin(distances)
            min_dist = float(distances[best_idx])

            if min_dist <= threshold:
                return self.user_data[best_idx], min_dist
            
            return None, min_dist
        except Exception as e:
            logger.error(f"BiometricRegistry: Match error: {e}")
            return None, 1.0

biometric_service = BiometricRegistry()
