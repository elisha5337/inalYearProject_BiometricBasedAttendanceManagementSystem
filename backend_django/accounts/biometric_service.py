import logging
import numpy as np
import cv2
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

    @staticmethod
    def enhance_image(image_array):
        """Standardized CLAHE enhancement for institutional environments."""
        try:
            lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            l_enhanced = clahe.apply(l)
            enhanced_img = cv2.merge((l_enhanced, a, b))
            return cv2.cvtColor(enhanced_img, cv2.COLOR_LAB2RGB)
        except Exception as e:
            logger.error(f"Enhancement error: {e}")
            return image_array

    @staticmethod
    def preprocess_face(image_array, box, padding=20):
        """
        Unified face preprocessing: Crop with padding, enhance, and resize.
        This provides parity between Enrollment and Verification.
        """
        try:
            x, y, w, h = box
            # Clamp all values — MTCNN can return negatives
            x = max(0, int(x))
            y = max(0, int(y))
            w = max(1, int(w))
            h = max(1, int(h))

            # Apply padding while respecting image boundaries
            y1 = max(0, y - padding)
            y2 = min(image_array.shape[0], y + h + padding)
            x1 = max(0, x - padding)
            x2 = min(image_array.shape[1], x + w + padding)

            # Guard against zero-size crop
            if y2 <= y1 or x2 <= x1:
                logger.warning("preprocess_face: zero-size crop, skipping")
                return None

            face_img = image_array[y1:y2, x1:x2]

            # 1. Enhance
            face_img = BiometricRegistry.enhance_image(face_img)

            # 2. Resize to FaceNet standard
            face_img = cv2.resize(face_img, (160, 160))

            return face_img
        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            return None

    def reload_cache(self):
        """Reloads all active face templates into memory.
        Templates are stored as normalized unit vectors at enrollment time,
        so we load them directly without re-normalizing.
        """
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

                embeddings = []
                for t in templates:
                    vec = np.array(t.template_data, dtype=np.float32)
                    norm = np.linalg.norm(vec)
                    # Normalize only if not already a unit vector (safety guard)
                    if norm > 0 and abs(norm - 1.0) > 1e-4:
                        vec = vec / norm
                    embeddings.append(vec)

                self.embeddings_matrix = np.array(embeddings, dtype=np.float32)

                logger.info(f"BiometricRegistry: Synchronized {len(self.user_data)} templates.")
                return True
            except Exception as e:
                logger.error(f"BiometricRegistry: Load error: {e}")
                return False

    def find_match(self, query_embedding, threshold=0.50):
        """
        Vectorized cosine similarity matching.
        Both stored templates and query_embedding are pre-normalized unit vectors.
        Distance = 1 - cosine_similarity. Lower distance = better match.
        Threshold 0.50 means cosine similarity >= 0.50 required for a match.
        """
        if self.embeddings_matrix is None or not self.user_data:
            logger.warning("No biometric templates enrolled in system")
            return None, 1.0

        try:
            q = np.array(query_embedding, dtype=np.float32)
            q_norm = np.linalg.norm(q)
            if q_norm == 0: return None, 1.0
            q = q / q_norm  # ensure normalized
            
            # Dot product of normalized vectors = Cosine Similarity
            similarities = np.dot(self.embeddings_matrix, q)
            distances = 1.0 - similarities
            
            best_idx = int(np.argmin(distances))
            min_dist = float(distances[best_idx])

            logger.debug(f"Best match: {self.user_data[best_idx]['username']} distance={min_dist:.4f} threshold={threshold}")

            if min_dist <= threshold:
                return self.user_data[best_idx], min_dist
            
            return None, min_dist
        except Exception as e:
            logger.error(f"BiometricRegistry: Match error: {e}")
            return None, 1.0

biometric_service = BiometricRegistry()
