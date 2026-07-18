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
  email_optional: { en: "Email (optional)", hi: "ईमेल (वैकल्पिक)" },
  mobile_number: { en: "Mobile number", hi: "मोबाइल नंबर" },
  password: { en: "Password", hi: "पासवर्ड" },
  dob: { en: "Date of birth (YYYY-MM-DD)", hi: "जन्म तिथि (YYYY-MM-DD)" },
  continue: { en: "Continue", hi: "आगे बढ़ें" },
  no_account: { en: "New here? Create an account", hi: "नए हैं? खाता बनाएँ" },
  send_code: { en: "Send code", hi: "कोड भेजें" },
  enter_code: { en: "Enter the 6-digit code", hi: "6-अंकों का कोड दर्ज करें" },
  code_sent_to: { en: "We sent a code to", hi: "हमने कोड भेजा है" },
  verify_continue: { en: "Verify & continue", hi: "सत्यापित करें और आगे बढ़ें" },
  resend_code: { en: "Resend code", hi: "कोड फिर भेजें" },
  change_number: { en: "Change number", hi: "नंबर बदलें" },
  dev_code_note: { en: "Test code (demo number)", hi: "टेस्ट कोड (डेमो नंबर)" },

  // appearance
  appearance: { en: "Appearance", hi: "रूप-रंग" },
  theme_system: { en: "System", hi: "सिस्टम" },
  theme_light: { en: "Light", hi: "उजाला" },
  theme_dark: { en: "Dark", hi: "अँधेरा" },

  // payments
  pay_now: { en: "Pay now", hi: "अभी भुगतान करें" },
  payment_secure_note: { en: "Secure payment via Razorpay. You'll be charged only after confirming.", hi: "Razorpay के माध्यम से सुरक्षित भुगतान। पुष्टि के बाद ही शुल्क लिया जाएगा।" },
  payment_failed: { en: "Payment could not be completed. Please try again.", hi: "भुगतान पूरा नहीं हो सका। कृपया पुनः प्रयास करें।" },
  payment_cancelled: { en: "Payment was cancelled.", hi: "भुगतान रद्द कर दिया गया।" },
  paid_via: { en: "Paid via Razorpay", hi: "Razorpay से भुगतान" },

  // crisis / emergency
  need_to_talk_now: { en: "Need to talk now?", hi: "अभी बात करनी है?" },
  you_not_alone: { en: "You are not alone", hi: "आप अकेले नहीं हैं" },
  crisis_intro: { en: "If you are in danger or in crisis, please reach one of these numbers now.", hi: "यदि आप खतरे या संकट में हैं, तो कृपया अभी इनमें से किसी नंबर पर संपर्क करें।" },
  book_a_psychologist: { en: "Book a psychologist", hi: "मनोवैज्ञानिक बुक करें" },
  or_reach_emergency: { en: "Or reach an emergency number right now:", hi: "या अभी किसी आपातकालीन नंबर पर संपर्क करें:" },
  call_now: { en: "Call", hi: "कॉल" },
  dismiss: { en: "Dismiss", hi: "बंद करें" },
  not_supported_title: { en: "This app does not support", hi: "यह ऐप इनका समर्थन नहीं करता" },
  not_supported_list: { en: "Trauma or PTSD · Sexual assault or abuse · Suicidal thoughts or self-harm · Domestic violence · Psychiatric emergencies · Crisis intervention", hi: "ट्रॉमा या PTSD · यौन उत्पीड़न या दुर्व्यवहार · आत्मघाती विचार या स्वयं को हानि · घरेलू हिंसा · मानसिक आपात · संकट हस्तक्षेप" },
  use_emergency_above: { en: "Please use the emergency resources above for immediate support.", hi: "तत्काल सहायता के लिए कृपया ऊपर दिए आपातकालीन संसाधनों का उपयोग करें।" },
  day_streak: { en: "day streak", hi: "दिन की श्रृंखला" },

  // progress chart clarity
  feel_map_caption: { en: "Each dot is one day over the last 6 weeks. Its colour shows how that day felt overall — so you can spot stretches of heavier or brighter days at a glance.", hi: "हर बिंदु पिछले 6 सप्ताह का एक दिन है। इसका रंग बताता है कि वह दिन कुल मिलाकर कैसा रहा — ताकि आप भारी या उज्जवल दिनों की श्रृंखला एक नज़र में देख सकें।" },
  mood_trend_caption: { en: "Your overall mood across the last 30 days. Taller bars are brighter days, shorter bars are heavier ones. Gaps are days without a check-in.", hi: "पिछले 30 दिनों में आपका समग्र मूड। ऊँची पट्टियाँ उज्जवल दिन, छोटी पट्टियाँ भारी दिन। रिक्त स्थान बिना चेक-इन वाले दिन हैं।" },
  weeks6_ago: { en: "6 weeks ago", hi: "6 सप्ताह पहले" },
  days30_ago: { en: "30 days ago", hi: "30 दिन पहले" },
  today_label: { en: "Today", hi: "आज" },
  no_checkin: { en: "No check-in", hi: "कोई चेक-इन नहीं" },
  brighter: { en: "Brighter", hi: "उज्जवल" },
  heavier: { en: "Heavier", hi: "भारी" },

  // registration: emergency contact + agreement
  emergency_contact: { en: "Emergency contact", hi: "आपातकालीन संपर्क" },
  ec_intro: { en: "Someone we can reach if we're ever concerned for your safety.", hi: "यदि हमें कभी आपकी सुरक्षा की चिंता हो तो हम किससे संपर्क करें।" },
  ec_name: { en: "Contact name", hi: "संपर्क का नाम" },
  ec_relationship: { en: "Relationship", hi: "रिश्ता" },
  ec_phone: { en: "Contact mobile number", hi: "संपर्क मोबाइल नंबर" },
  select_relationship: { en: "Select relationship", hi: "रिश्ता चुनें" },
  rel_parent: { en: "Parent", hi: "माता-पिता" },
  rel_spouse: { en: "Spouse", hi: "जीवनसाथी" },
  rel_partner: { en: "Partner", hi: "साथी" },
  rel_sibling: { en: "Sibling", hi: "भाई-बहन" },
  rel_child: { en: "Child", hi: "संतान" },
  rel_friend: { en: "Friend", hi: "मित्र" },
  rel_relative: { en: "Relative", hi: "रिश्तेदार" },
  rel_other: { en: "Other", hi: "अन्य" },
  agreement_title: { en: "Consent & safety agreement", hi: "सहमति और सुरक्षा अनुबंध" },
  agreement_body: {
    en: "By continuing, you agree that TherapiShots may access and process the health and wellbeing data you provide (moods, notes, and any connected health signals) solely to power your check-ins, patterns and personalised support.\n\nYour information is kept strictly confidential and is never sold. During a consultation, your psychologist is bound by confidentiality. However, if the psychologist reasonably believes you are at risk of serious harm to yourself or others, they may break confidentiality and contact emergency services or your emergency contact to help keep you safe.\n\nTherapiShots is a wellbeing reflection tool, not a medical or crisis service.",
    hi: "जारी रखने पर, आप सहमत हैं कि TherapiShots आपके द्वारा दिए गए स्वास्थ्य व कल्याण डेटा (मूड, नोट्स और जुड़े स्वास्थ्य संकेत) को केवल आपके चेक-इन, पैटर्न और व्यक्तिगत सहायता के लिए एक्सेस व प्रोसेस कर सकता है।\n\nआपकी जानकारी पूर्णतः गोपनीय रखी जाती है और कभी बेची नहीं जाती। परामर्श के दौरान आपका मनोवैज्ञानिक गोपनीयता के लिए बाध्य है। परंतु यदि मनोवैज्ञानिक को उचित रूप से लगे कि आप स्वयं या दूसरों के लिए गंभीर जोखिम में हैं, तो वह गोपनीयता तोड़कर आपकी सुरक्षा हेतु आपातकालीन सेवाओं या आपके आपातकालीन संपर्क से संपर्क कर सकता है।\n\nTherapiShots एक कल्याण चिंतन उपकरण है, कोई चिकित्सा या संकट सेवा नहीं।",
  },
  agree_checkbox: { en: "I have read and agree to the above", hi: "मैंने उपरोक्त पढ़ा और सहमत हूँ" },
  read_agreement: { en: "Read the agreement", hi: "अनुबंध पढ़ें" },
  must_agree: { en: "Please accept the agreement to continue.", hi: "जारी रखने के लिए कृपया अनुबंध स्वीकार करें।" },

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
  resources_intro: { en: "Simple, everyday practices you can try. These are self-help ideas, not medical advice.", hi: "आज़माने के लिए सरल, रोज़मर्रा के अभ्यास। ये स्व-सहायता विचार हैं, चिकित्सा सलाह नहीं।" },
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

  // talk to someone / 15-min call
  talk_title: { en: "Would talking to someone help?", hi: "क्या किसी से बात करना मदद करेगा?" },
  talk_body: { en: "A 15-minute call with a psychologist can help you talk things through.", hi: "किसी मनोवैज्ञानिक के साथ 15-मिनट की कॉल बात को समझने में मदद कर सकती है।" },
  book_15_call: { en: "Book a 15-min call", hi: "15-मिनट की कॉल बुक करें" },
  min_call: { en: "15-min Call", hi: "15-मिनट कॉल" },
  recommended_for_you: { en: "Suggested for you", hi: "आपके लिए सुझाव" },

  // multiple check-ins / today entries
  add_detail: { en: "Add a note or context", hi: "टिप्पणी या संदर्भ जोड़ें" },
  todays_checkins_title: { en: "Today's check-ins", hi: "आज के चेक-इन" },
  multi_note: { en: "You can check in whenever you like — every moment counts.", hi: "आप जब चाहें चेक-इन कर सकते हैं — हर पल मायने रखता है।" },
  tap_mood_hint: { en: "Tap how you feel to check in", hi: "चेक-इन करने के लिए अपनी भावना पर टैप करें" },
  checkin_again: { en: "Feeling different? Check in again", hi: "अलग महसूस हो रहा है? फिर से चेक-इन करें" },
  entries_count: { en: "check-in(s) today", hi: "आज चेक-इन" },

  // insights daily strip
  last7_days: { en: "Your last 7 days", hi: "आपके पिछले 7 दिन" },

  // booking
  psychologists_title: { en: "Find a psychologist", hi: "मनोवैज्ञानिक खोजें" },
  filter_language: { en: "Language", hi: "भाषा" },
  filter_all: { en: "All", hi: "सभी" },
  verified: { en: "Verified", hi: "सत्यापित" },
  years_exp: { en: "yrs experience", hi: "वर्ष अनुभव" },
  per_session: { en: "per session", hi: "प्रति सत्र" },
  specializes_in: { en: "Specializes in", hi: "विशेषज्ञता" },
  languages_label: { en: "Languages", hi: "भाषाएँ" },
  book_session: { en: "Book a session", hi: "सत्र बुक करें" },
  choose_slot: { en: "Choose a time", hi: "समय चुनें" },
  session_type_label: { en: "Session type", hi: "सत्र प्रकार" },
  confirm_pay: { en: "Confirm & pay", hi: "पुष्टि करें और भुगतान करें" },
  payment_mock_note: { en: "Payment is simulated for now — no real charge is made.", hi: "फ़िलहाल भुगतान नकली है — कोई वास्तविक शुल्क नहीं लिया जाता।" },
  booking_confirmed: { en: "Your session is confirmed", hi: "आपका सत्र पुष्टि हो गया है" },
  appointments_title: { en: "My appointments", hi: "मेरी अपॉइंटमेंट" },
  no_appointments: { en: "No appointments yet.", hi: "अभी कोई अपॉइंटमेंट नहीं।" },
  cancel_booking: { en: "Cancel booking", hi: "बुकिंग रद्द करें" },
  status_confirmed: { en: "Confirmed", hi: "पुष्टि" },
  status_cancelled: { en: "Cancelled", hi: "रद्द" },
  view_appointments: { en: "View my appointments", hi: "मेरी अपॉइंटमेंट देखें" },
  test_data_note: { en: "Profiles shown are demo/test data.", hi: "दिखाए गए प्रोफ़ाइल डेमो/परीक्षण डेटा हैं।" },
  paid: { en: "Paid", hi: "भुगतान किया" },
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
