export type Lang = "en" | "hi";

type Dict = Record<string, { en: string; hi: string }>;

export const STR: Dict = {
  app_name: { en: "TherapiShots", hi: "TherapiShots" },
  tagline: { en: "Small Steps Today, Better Tomorrow", hi: "आज छोटे कदम, बेहतर कल" },

  // onboarding / auth
  welcome_title: { en: "A quiet place to notice how you feel", hi: "यह महसूस करने की एक शांत जगह" },
  welcome_body: { en: "Check in each day in seconds. Over time, TherapiShots gently shows what seems to affect how you feel.", hi: "हर दिन कुछ सेकंड में चेक-इन करें। समय के साथ TherapiShots दिखाता है कि आपकी भावनाओं को क्या प्रभावित करता है।" },
  get_started: { en: "Get started", hi: "शुरू करें" },
  i_have_account: { en: "I already have an account", hi: "मेरा पहले से खाता है" },
  age_confirm: { en: "I confirm I am 18 years or older", hi: "मैं पुष्टि करता/करती हूँ कि मैं 18 वर्ष या उससे अधिक का हूँ" },
  choose_language: { en: "Choose your language", hi: "अपनी भाषा चुनें" },
  english: { en: "English", hi: "अंग्रेज़ी" },
  hindi: { en: "हिन्दी", hi: "हिन्दी" },
  create_account: { en: "Create account", hi: "खाता बनाएँ" },
  log_in: { en: "Log in", hi: "लॉग इन" },
  name: { en: "Name", hi: "नाम" },
  email: { en: "Email", hi: "ईमेल" },
  password: { en: "Password", hi: "पासवर्ड" },
  dob: { en: "Date of birth (YYYY-MM-DD)", hi: "जन्म तिथि (YYYY-MM-DD)" },
  continue: { en: "Continue", hi: "आगे बढ़ें" },
  no_account: { en: "New here? Create an account", hi: "नए हैं? खाता बनाएँ" },

  // tabs
  tab_today: { en: "Today", hi: "आज" },
  tab_insights: { en: "Insights", hi: "अंतर्दृष्टि" },
  tab_progress: { en: "Progress", hi: "प्रगति" },
  tab_support: { en: "Support", hi: "सहारा" },
  tab_me: { en: "Me", hi: "मैं" },

  // today
  good_morning: { en: "Good morning", hi: "सुप्रभात" },
  good_afternoon: { en: "Good afternoon", hi: "नमस्कार" },
  good_evening: { en: "Good evening", hi: "शुभ संध्या" },
  how_feeling: { en: "How are you feeling today?", hi: "आज आप कैसा महसूस कर रहे हैं?" },
  check_in_now: { en: "Check in", hi: "चेक-इन करें" },
  checked_in: { en: "You've checked in today", hi: "आपने आज चेक-इन कर लिया है" },
  update_checkin: { en: "Update check-in", hi: "चेक-इन बदलें" },
  todays_signals: { en: "Today's health signals", hi: "आज के स्वास्थ्य संकेत" },
  signal_sleep: { en: "Sleep", hi: "नींद" },
  signal_steps: { en: "Steps", hi: "कदम" },
  signal_activity: { en: "Activity", hi: "गतिविधि" },
  signal_rhr: { en: "Resting Heart Rate", hi: "आराम की हृदय गति" },
  signal_hrv: { en: "HRV", hi: "HRV" },
  around_baseline: { en: "Around your baseline", hi: "आपके आधारभूत स्तर के आसपास" },
  notice_title: { en: "Something you may want to notice", hi: "कुछ जिस पर आप ध्यान देना चाहें" },
  feel_true: { en: "Does this feel true for you?", hi: "क्या यह आपको सही लगता है?" },
  yes: { en: "Yes", hi: "हाँ" },
  maybe: { en: "Maybe", hi: "शायद" },
  not_really: { en: "Not really", hi: "ठीक नहीं" },
  one_small_step: { en: "One small step", hi: "एक छोटा कदम" },
  simulated_note: { en: "Health signals are simulated in preview.", hi: "पूर्वावलोकन में स्वास्थ्य संकेत नकली हैं।" },

  // checkin flow
  pick_mood: { en: "How are you feeling right now?", hi: "अभी आप कैसा महसूस कर रहे हैं?" },
  context_q: { en: "Anything affecting how you feel today?", hi: "क्या आज आपकी भावनाओं को कुछ प्रभावित कर रहा है?" },
  add_note: { en: "Add a short note (optional)", hi: "एक छोटी टिप्पणी जोड़ें (वैकल्पिक)" },
  skip: { en: "Skip", hi: "छोड़ें" },
  save_checkin: { en: "Save check-in", hi: "चेक-इन सहेजें" },
  thanks_checkin: { en: "Thanks for checking in.", hi: "चेक-इन के लिए धन्यवाद।" },
  helpful_now: { en: "Would anything feel helpful right now?", hi: "क्या अभी कुछ मददगार लगेगा?" },
  see_affecting: { en: "See what may be affecting me", hi: "देखें क्या मुझे प्रभावित कर सकता है" },
  take_step: { en: "Take a small step", hi: "एक छोटा कदम उठाएँ" },
  connect_psych: { en: "Connect with a psychologist", hi: "मनोवैज्ञानिक से जुड़ें" },
  im_okay: { en: "I'm okay for now", hi: "अभी मैं ठीक हूँ" },
  done: { en: "Done", hi: "पूरा हुआ" },

  // context tags
  ctx_work: { en: "Work", hi: "काम" },
  ctx_family: { en: "Family", hi: "परिवार" },
  ctx_relationships: { en: "Relationships", hi: "रिश्ते" },
  ctx_health: { en: "Health", hi: "सेहत" },
  ctx_sleep: { en: "Sleep", hi: "नींद" },
  ctx_money: { en: "Money", hi: "पैसे" },
  ctx_exercise: { en: "Exercise", hi: "व्यायाम" },
  ctx_social: { en: "Social", hi: "सामाजिक" },
  ctx_travel: { en: "Travel", hi: "यात्रा" },
  ctx_weather: { en: "Weather", hi: "मौसम" },
  ctx_other: { en: "Other", hi: "अन्य" },

  // insights
  insights_q: { en: "What seems to affect how I feel?", hi: "मेरी भावनाओं को क्या प्रभावित करता है?" },
  what_helps: { en: "What seems to help", hi: "जो मदद करता दिखता है" },
  what_harder: { en: "What may make things harder", hi: "जो कठिन बना सकता है" },
  patterns_notice: { en: "Patterns worth noticing", hi: "ध्यान देने योग्य पैटर्न" },
  context_patterns: { en: "Context patterns", hi: "संदर्भ पैटर्न" },
  why_seeing: { en: "Why am I seeing this?", hi: "मुझे यह क्यों दिख रहा है?" },
  insights_empty: { en: "As you check in, patterns will gently emerge here.", hi: "जैसे-जैसे आप चेक-इन करेंगे, यहाँ धीरे-धीरे पैटर्न उभरेंगे।" },

  // pulse
  pulse_title: { en: "Your Wellbeing Pulse", hi: "आपकी वेलबीइंग पल्स" },
  pulse_mood: { en: "Mood", hi: "मनोदशा" },
  pulse_sleep: { en: "Sleep", hi: "नींद" },
  pulse_activity: { en: "Activity", hi: "गतिविधि" },
  pulse_recovery: { en: "Recovery", hi: "रिकवरी" },
  status_above: { en: "Above your usual range", hi: "आपकी सामान्य सीमा से ऊपर" },
  status_below: { en: "Below your usual range", hi: "आपकी सामान्य सीमा से नीचे" },
  status_around: { en: "Around your normal level", hi: "आपके सामान्य स्तर के आसपास" },
  status_mixed: { en: "Not enough data yet", hi: "अभी पर्याप्त डेटा नहीं" },

  // progress
  progress_month: { en: "check-ins this month", hi: "इस महीने चेक-इन" },
  feel_map: { en: "Your Feel Map", hi: "आपका फील मैप" },
  mood_trend: { en: "Mood trend", hi: "मनोदशा की प्रवृत्ति" },
  sleep_trend: { en: "Sleep trend", hi: "नींद की प्रवृत्ति" },
  activity_trend: { en: "Activity trend", hi: "गतिविधि की प्रवृत्ति" },
  your_story: { en: "Your Story", hi: "आपकी कहानी" },
  read_story: { en: "Read your story", hi: "अपनी कहानी पढ़ें" },
  weekly: { en: "This week", hi: "इस सप्ताह" },
  monthly: { en: "This month", hi: "इस महीने" },

  // support
  support_title: { en: "You don't have to do this alone", hi: "आपको यह अकेले नहीं करना है" },
  breathe: { en: "Take a breath", hi: "एक साँस लें" },
  breathe_in: { en: "Breathe in", hi: "साँस लें" },
  breathe_hold: { en: "Hold", hi: "रोकें" },
  breathe_out: { en: "Breathe out", hi: "साँस छोड़ें" },
  find_psych: { en: "Find a psychologist", hi: "मनोवैज्ञानिक खोजें" },
  coming_soon: { en: "Coming soon", hi: "जल्द आ रहा है" },
  my_appointments: { en: "My appointments", hi: "मेरी अपॉइंटमेंट" },
  resources: { en: "Wellbeing resources", hi: "वेलबीइंग संसाधन" },
  emergency: { en: "Emergency support", hi: "आपातकालीन सहायता" },
  emergency_note: { en: "If you are in immediate danger, contact local emergency services. TherapiShots is not an emergency service.", hi: "यदि आप तत्काल खतरे में हैं, तो स्थानीय आपातकालीन सेवाओं से संपर्क करें। TherapiShots एक आपातकालीन सेवा नहीं है।" },
  repeated_low_title: { en: "Would some extra support help?", hi: "क्या कुछ अतिरिक्त सहारा मदद करेगा?" },
  repeated_low_body: { en: "You've reported feeling lower than your usual pattern in several recent check-ins.", hi: "हाल के कई चेक-इन में आपने सामान्य से कम महसूस करने की बात कही है।" },
  explore_patterns: { en: "Explore my patterns", hi: "मेरे पैटर्न देखें" },
  not_now: { en: "Not now", hi: "अभी नहीं" },

  // me / privacy
  privacy_center: { en: "Your Data & Privacy", hi: "आपका डेटा और गोपनीयता" },
  privacy_sub: { en: "Private by default. You are in control.", hi: "डिफ़ॉल्ट रूप से निजी। नियंत्रण आपके पास है।" },
  language: { en: "Language", hi: "भाषा" },
  health_connections: { en: "Health connections", hi: "स्वास्थ्य कनेक्शन" },
  export_data: { en: "Export my data", hi: "मेरा डेटा निर्यात करें" },
  delete_mood: { en: "Delete mood history", hi: "मनोदशा इतिहास हटाएँ" },
  delete_account: { en: "Delete account", hi: "खाता हटाएँ" },
  log_out: { en: "Log out", hi: "लॉग आउट" },
  consent_note: { en: "Each control is granular and revocable, enforced on our servers.", hi: "प्रत्येक नियंत्रण सूक्ष्म और वापस लेने योग्य है, हमारे सर्वर पर लागू।" },
  save: { en: "Save", hi: "सहेजें" },

  // consent labels
  c_mood_history: { en: "Mood History", hi: "मनोदशा इतिहास" },
  c_health_data: { en: "Health Data", hi: "स्वास्थ्य डेटा" },
  c_sleep_data: { en: "Sleep Data", hi: "नींद डेटा" },
  c_activity_data: { en: "Activity Data", hi: "गतिविधि डेटा" },
  c_heart_data: { en: "Heart Data", hi: "हृदय डेटा" },
  c_personal_insights: { en: "Personal Insights", hi: "व्यक्तिगत अंतर्दृष्टि" },
  c_ai_summaries: { en: "AI Summaries", hi: "AI सारांश" },
  c_psychologist_sharing: { en: "Psychologist Sharing", hi: "मनोवैज्ञानिक साझाकरण" },
  c_analytics: { en: "Analytics", hi: "एनालिटिक्स" },
  c_marketing: { en: "Marketing Communications", hi: "मार्केटिंग संचार" },

  not_medical: { en: "TherapiShots is a self-reflection tool. It does not diagnose or provide medical advice.", hi: "TherapiShots एक आत्म-चिंतन उपकरण है। यह निदान या चिकित्सा सलाह नहीं देता।" },
  loading: { en: "Loading…", hi: "लोड हो रहा है…" },
  retry: { en: "Retry", hi: "पुनः प्रयास" },
  error_sync: { en: "Something went out of sync", hi: "कुछ सिंक से बाहर हो गया" },
};

export function makeT(lang: Lang) {
  return (key: string): string => {
    const entry = STR[key];
    if (!entry) return key;
    return entry[lang] || entry.en;
  };
}
