import { useState, useEffect } from 'react';

const dict: Record<string, Record<string, string>> = {
  en: {},
  am: {
    // Sidebar
    'Dashboard': 'ዳሽቦርድ',
    'My Attendance': 'የእኔ ክትትል',
    'Submit Leave': 'ፈቃድ ጠይቅ',
    'Leave History': 'የፈቃድ ታሪክ',
    'My Profile': 'የግል ማህደር',
    'Help Center': 'የእገዛ ማዕከል',
    'Employees': 'ሰራተኞች',
    'Attendance': 'ክትትል',
    'Leave Requests': 'የፈቃድ ጥያቄዎች',
    'Manage Shifts': 'የስራ ሰዓት አስተዳድር',
    'Reports': 'ሪፖርቶች',
    'Manage Users': 'ተጠቃሚዎችን አስተዳድር',
    'Audit Log': 'የኦዲት መዝገብ',
    'Policies': 'መመሪያዎች',
    'Enroll Biometrics': 'ባዮሜትሪክስ አስገባ',
    'Devices': 'መሳሪያዎች',
    'Workflows': 'የስራ ሂደቶች',
    'Notifications': 'ማሳወቂያዎች',
    'Integrations': 'ግንኙነቶች',
    'Leave Oversight': 'የፈቃድ ቁጥጥር',
    'System Oversight': 'የስርዓት ቁጥጥር',
    
    // Header
    'Search records...': 'መዝገቦችን ይፈልጉ...',
    'Search Results': 'የፍለጋ ውጤቶች',
    'Loading live records...': 'የቀጥታ መዝገቦችን በመጫን ላይ...',
    'No matching records found.': 'ምንም የሚዛመዱ መዝገቦች አልተገኙም።',
    'Sign Out': 'ዘግተህ ውጣ',
    'Refresh System': 'ስርዓቱን ያድሱ',
    'Settings': 'ቅንብሮች',
    
    // Admin Dashboard
    'Welcome Back': 'እንኳን ደህና መጡ',
    'System Administration': 'የስርዓት አስተዳደር',
    'Global system health, security monitoring and configuration': 'አለምአቀፍ የስርዓት ጤና፣ ደህንነት ክትትል እና ውቅረት',
    'System Logs': 'የስርዓት ምዝግብ ማስታወሻዎች',
    'Global Settings': 'አለምአቀፍ ቅንብሮች',
    'Total Users': 'ጠቅላላ ተጠቃሚዎች',
    'Active Accounts': 'ገባሪ መለያዎች',
    'Suspended': 'የታገዱ',
    'Bio-Enrolled': 'ባዮ-የተመዘገቡ',
    'Main Server': 'ዋና አገልጋይ',
    'Database': 'የውሂብ ጎታ',
    'Biometric Nodes': 'ባዮሜትሪክ ኖዶች',
    'Authentication Load': 'የማረጋገጫ ጫና',
    'Real-time Traffic': 'የቀጥታ ትራፊክ',
    'Administrative Tasks': 'የአስተዳደር ተግባራት',
    'Configure Devices': 'መሳሪያዎችን ያዋቅሩ',
    'Security Policies': 'የደህንነት መመሪያዎች',
    'Recent Audit Events': 'የቅርብ ጊዜ ኦዲት',
    'View Full Log': 'ሙሉውን መዝገብ እይ',
    'Here is your administrative overview for today.': 'የዛሬው የአስተዳደር አጠቃላይ እይታዎ ይኸውና።',
    
    // HR Dashboard
    'HR Overview': 'የሰው ኃይል አጠቃላይ እይታ',
    'Real-time workforce metrics and pending actions': 'የቀጥታ የስራ ኃይል ስታቲስቲክስ እና በመጠባበቅ ላይ ያሉ ተግባራት',
    'Late Arrivals': 'አርፍደው የመጡ',
    'Leave Balance': 'የፈቃድ ቀሪ',
    'System Status': 'የስርዓት ሁኔታ',
    'All Devices Online': 'ሁሉም መሳሪያዎች በመስመር ላይ ናቸው',
    
    // Employee Dashboard
    'Welcome back,': 'እንኳን ደህና መጡ,',
    'Attendance summary for': 'የክትትል ማጠቃለያ ለ',
    'Currently Checked In': 'በአሁኑ ጊዜ ገብተዋል',
    'Awaiting Check-in': 'ለመግባት በመጠባበቅ ላይ',
    "Today's Hours": 'የዛሬ ሰዓታት',
    'Days Present': 'የተገኙባቸው ቀናት',
    'Weekly Activity': 'ሳምንታዊ እንቅስቃሴ',
    'Recent Activity': 'የቅርብ ጊዜ እንቅስቃሴ',
    
    // Manage Users
    'Administration': 'አስተዳደር',
    'Browse employee database and manage profile details in a single workspace.': 'የሰራተኞችን ዳታቤዝ ያስሱ እና የፕሮፋይል ዝርዝሮችን በአንድ የስራ ቦታ ያስተዳድሩ።',
    'Admin': 'አስተዳዳሪ',
    'Search Database': 'ዳታቤዝ ይፈልጉ',
    'Search by name, position, or department...': 'በስም፣ በቦታ ወይም በክፍል ይፈልጉ...',
    'Filter Role': 'የስራ ድርሻ አጣራ',
    'All roles': 'ሁሉም የስራ ድርሻዎች',
    'User Record': 'የተጠቃሚ መዝገብ',
    
    // Manage Leave
    'Review and process employee leave applications': 'የሰራተኞችን የፈቃድ ጥያቄዎችን ይገምግሙ እና ያጽድቁ',
    'Pending': 'በመጠባበቅ ላይ',
    'Approved': 'የጸደቀ',
    'Rejected': 'ውድቅ የተደረገ',
    'Synchronizing Leave Records...': 'የፈቃድ መዝገቦችን በማመሳሰል ላይ...',
    'Export Leave Report': 'የፈቃድ ሪፖርት ላክ'
  },
  fr: {
    // Sidebar
    'Dashboard': 'Tableau de bord',
    'My Attendance': 'Ma présence',
    'Submit Leave': 'Demander un congé',
    'Leave History': 'Historique des congés',
    'My Profile': 'Mon profil',
    'Help Center': "Centre d'aide",
    'Employees': 'Employés',
    'Attendance': 'Présence',
    'Leave Requests': 'Demandes de congé',
    'Manage Shifts': 'Gérer les horaires',
    'Reports': 'Rapports',
    'Manage Users': 'Gérer utilisateurs',
    'Audit Log': "Journal d'audit",
    'Policies': 'Politiques',
    'Enroll Biometrics': 'Enregistrer Biométrie',
    'Devices': 'Appareils',
    'Workflows': 'Flux de travail',
    'Notifications': 'Notifications',
    'Integrations': 'Intégrations',
    'Leave Oversight': 'Supervision congés',
    'System Oversight': 'Supervision système',
    
    // Header
    'Search records...': 'Rechercher...',
    'Search Results': 'Résultats de recherche',
    'Loading live records...': 'Chargement...',
    'No matching records found.': 'Aucun résultat trouvé.',
    'Sign Out': 'Déconnexion',
    'Refresh System': 'Rafraîchir',
    'Settings': 'Paramètres',
    
    // Admin Dashboard
    'Welcome Back': 'Bon retour',
    'System Administration': 'Administration du système',
    'Global system health, security monitoring and configuration': 'Santé globale du système, sécurité et configuration',
    'System Logs': 'Journaux système',
    'Global Settings': 'Paramètres globaux',
    'Total Users': 'Total Utilisateurs',
    'Active Accounts': 'Comptes actifs',
    'Suspended': 'Suspendus',
    'Bio-Enrolled': 'Bio-Inscrits',
    'Main Server': 'Serveur principal',
    'Database': 'Base de données',
    'Biometric Nodes': 'Nœuds biométriques',
    'Authentication Load': "Charge d'authentification",
    'Real-time Traffic': 'Trafic en temps réel',
    'Administrative Tasks': 'Tâches administratives',
    'Configure Devices': 'Configurer appareils',
    'Security Policies': 'Politiques de sécurité',
    'Recent Audit Events': 'Événements audit',
    'View Full Log': 'Voir tout le journal',
    'Here is your administrative overview for today.': "Voici votre aperçu administratif pour aujourd'hui.",

    // HR Dashboard
    'HR Overview': 'Aperçu RH',
    'Real-time workforce metrics and pending actions': 'Métriques en temps réel et actions en attente',
    'Late Arrivals': 'Arrivées tardives',
    'Leave Balance': 'Solde de congés',
    'System Status': 'État du système',
    'All Devices Online': 'Tous les appareils en ligne',
    
    // Employee Dashboard
    'Welcome back,': 'Bon retour,',
    'Attendance summary for': 'Résumé de présence pour',
    'Currently Checked In': 'Actuellement pointé',
    'Awaiting Check-in': 'En attente de pointage',
    "Today's Hours": "Heures d'aujourd'hui",
    'Days Present': 'Jours de présence',
    'Weekly Activity': 'Activité hebdomadaire',
    'Recent Activity': 'Activité récente',
    
    // Manage Users
    'Administration': 'Administration',
    'Browse employee database and manage profile details in a single workspace.': 'Parcourez la base de données des employés et gérez les profils dans un espace de travail unique.',
    'Admin': 'Administrateur',
    'Search Database': 'Rechercher dans la base',
    'Search by name, position, or department...': 'Rechercher par nom, poste ou département...',
    'Filter Role': 'Filtrer par rôle',
    'All roles': 'Tous les rôles',
    'User Record': 'Dossier utilisateur',
    
    // Manage Leave
    'Review and process employee leave applications': 'Examiner et traiter les demandes de congé',
    'Pending': 'En attente',
    'Approved': 'Approuvé',
    'Rejected': 'Rejeté',
    'Synchronizing Leave Records...': 'Synchronisation des dossiers de congés...',
    'Export Leave Report': 'Exporter le rapport de congés'
  }
};

export function useLanguage() {
  const [lang, setLang] = useState(localStorage.getItem('app_language') || 'en');

  useEffect(() => {
    const handleLangChange = () => setLang(localStorage.getItem('app_language') || 'en');
    window.addEventListener('languageChanged', handleLangChange);
    return () => window.removeEventListener('languageChanged', handleLangChange);
  }, []);

  const t = (text: string) => dict[lang]?.[text] || text;
  
  return { lang, t };
}
