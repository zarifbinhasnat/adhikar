/**
 * Bilingual string constants (English + Bangla).
 * Keyed by language code: 'EN' | 'BN'.
 */

const STRINGS = {
  EN: {
    // Home
    appTitle: 'Know Your Rights BD',
    searchPlaceholder: 'Search laws / ask a question',
    whatDoYouNeed: 'What do you need?',
    emergencyButton: "I'm in danger now",
    offlinePacks: 'Downloaded offline packs',
    arrestDetention: 'Arrest & detention',
    grsGuide: 'GRS complaint guide',

    // Navigation cards
    policeStop: 'Police stop',
    record: 'Record',
    myRights: 'My rights',
    complain: 'Complain',
    legalAid: 'Legal aid',
    rti: 'RTI',

    // Police Stop
    policeStopTitle: 'Police stop',
    stayCalmMessage: 'Stay calm. Keep hands visible.',
    youMayAsk: 'You may ask:',
    askArrest: '"Am I under arrest?"',
    askReason: '"What is the reason for this stop?"',
    yourRights: 'Your rights',
    rightToKnow: 'To know the grounds of arrest',
    rightToLawyer: 'To consult a legal practitioner',
    rightToFamily: 'To have your family informed',
    readAloud: 'Read aloud',
    callContact: 'Call contact',
    startRecording: 'Start recording',
    stopRecording: 'Stop recording',

    // Record
    recordTitle: 'Record & Send',
    gps: 'GPS',
    on: 'On',
    witnesses: 'Witnesses',
    incidentNote: 'Incident Note',
    hashVerified: 'Hash verified • Secure',
    recordBtn: 'Record',
    stopBtn: 'Stop',
    saveOffline: 'Save Offline',
    upload: 'Upload',
    cameraPermission: 'Camera permission required',
    grantPermission: 'Grant Permission',
    requestingPermission: 'Requesting permission...',

    // Rights Library
    rightsLibraryTitle: 'Rights Library',
    plainLanguage: 'Plain language',
    sourceText: 'Source text',
    bangla: 'Bangla',
    english: 'English',
    verifiedAgainst: 'Verified against Bangladesh Code',
    lastVerified: 'Last verified',
    copy: 'Copy',
    save: 'Save',
    share: 'Share',
    searchRights: 'Search articles...',

    // Complaint
    fileComplaint: 'File a complaint',
    issueType: 'Issue type',
    bestRoute: 'Best route (Auto-selected)',
    details: 'Details',
    detailsPlaceholder: 'Describe what happened...',
    attachments: 'Attachments',
    photo: '+ Photo',
    audio: '+ Audio',
    note: '+ Note',
    saveDraft: 'Save Draft',
    submit: 'Submit',
    myTrackingCards: 'My tracking cards',
    inReview: 'In review',
    assigned: 'Assigned',
    draftSaved: 'Draft saved!',
    draftLoaded: 'Draft loaded',
    noDraft: 'No saved draft found',

    // Legal Aid
    legalAidTitle: 'Legal Aid Directory',
    legalAidDesc: 'Free and subsidised legal support services in Bangladesh',
    callNow: 'Call Now',
    visitWebsite: 'Visit Website',
    nationalHelpline: 'National Helpline',

    // RTI
    rtiTitle: 'Right to Information',
    rtiDesc: 'Your right to seek information from any public authority under the RTI Act 2009',
    step: 'Step',
    rtiTemplate: 'RTI Application Template',
    copyTemplate: 'Copy Template',
    templateCopied: 'Template text copied!',

    // Evidence Vault & Detail
    evidenceVault: 'Evidence Vault',
    evidenceVaultTitle: 'Evidence Vault',
    evidenceVaultDesc: 'Review saved records, inspect hashes, and share files securely.',
    savedEvidence: 'Saved Evidence',
    evidenceDetails: 'Evidence Details',
    evidenceDetailTitle: 'Evidence Detail',
    typeLabel: 'Type',
    dateLabel: 'Date',
    noteLabel: 'Note',
    hashLabel: 'Integrity Hash',
    latitudeLabel: 'Latitude',
    longitudeLabel: 'Longitude',
    shareEvidence: 'Share / Save to Cloud',
    noEvidenceFound: 'No evidence has been saved yet.',
    openEvidenceVault: 'Open Evidence Vault',
    recordingSaved: 'Recording saved to local vault!',
    recordingError: 'Error saving recording.',
    viewFullDetails: 'View Full Details & Play',
    deleteEvidence: 'Delete Evidence',
    confirmDelete: 'Are you sure you want to delete this evidence permanently?',
    microphonePermission: 'Microphone permission is required for audio in recordings.',
    playEvidence: 'Play Evidence',
    cancel: 'Cancel',
    delete: 'Delete',
  },

  BN: {
    // Home
    appTitle: 'আপনার অধিকার জানুন BD',
    searchPlaceholder: 'আইন খুঁজুন / প্রশ্ন করুন',
    whatDoYouNeed: 'আপনার কী প্রয়োজন?',
    emergencyButton: 'আমি এখন বিপদে আছি',
    offlinePacks: 'ডাউনলোড করা অফলাইন প্যাক',
    arrestDetention: 'গ্রেফতার ও আটক',
    grsGuide: 'GRS অভিযোগ গাইড',

    // Navigation cards
    policeStop: 'পুলিশ স্টপ',
    record: 'রেকর্ড',
    myRights: 'আমার অধিকার',
    complain: 'অভিযোগ',
    legalAid: 'আইনি সহায়তা',
    rti: 'তথ্য অধিকার',

    // Police Stop
    policeStopTitle: 'পুলিশ স্টপ',
    stayCalmMessage: 'শান্ত থাকুন। হাত দৃশ্যমান রাখুন।',
    youMayAsk: 'আপনি জিজ্ঞাসা করতে পারেন:',
    askArrest: '"আমি কি গ্রেফতার?"',
    askReason: '"এই স্টপের কারণ কী?"',
    yourRights: 'আপনার অধিকার',
    rightToKnow: 'গ্রেফতারের কারণ জানার অধিকার',
    rightToLawyer: 'আইনজীবীর সাথে পরামর্শের অধিকার',
    rightToFamily: 'পরিবারকে জানানোর অধিকার',
    readAloud: 'জোরে পড়ুন',
    callContact: 'কল করুন',
    startRecording: 'রেকর্ডিং শুরু',
    stopRecording: 'রেকর্ডিং বন্ধ',

    // Record
    recordTitle: 'রেকর্ড ও পাঠান',
    gps: 'GPS',
    on: 'চালু',
    witnesses: 'সাক্ষী',
    incidentNote: 'ঘটনার নোট',
    hashVerified: 'হ্যাশ যাচাই • সুরক্ষিত',
    recordBtn: 'রেকর্ড',
    stopBtn: 'বন্ধ',
    saveOffline: 'অফলাইন সেভ',
    upload: 'আপলোড',
    cameraPermission: 'ক্যামেরা অনুমতি প্রয়োজন',
    grantPermission: 'অনুমতি দিন',
    requestingPermission: 'অনুমতি চাওয়া হচ্ছে...',

    // Rights Library
    rightsLibraryTitle: 'অধিকার লাইব্রেরি',
    plainLanguage: 'সহজ ভাষায়',
    sourceText: 'মূল পাঠ্য',
    bangla: 'বাংলা',
    english: 'ইংরেজি',
    verifiedAgainst: 'বাংলাদেশ কোডের বিপরীতে যাচাইকৃত',
    lastVerified: 'সর্বশেষ যাচাই',
    copy: 'কপি',
    save: 'সেভ',
    share: 'শেয়ার',
    searchRights: 'অনুচ্ছেদ খুঁজুন...',

    // Complaint
    fileComplaint: 'অভিযোগ দায়ের করুন',
    issueType: 'সমস্যার ধরন',
    bestRoute: 'সেরা রুট (স্বয়ংক্রিয় নির্বাচিত)',
    details: 'বিস্তারিত',
    detailsPlaceholder: 'কী ঘটেছে বর্ণনা করুন...',
    attachments: 'সংযুক্তি',
    photo: '+ ছবি',
    audio: '+ অডিও',
    note: '+ নোট',
    saveDraft: 'ড্রাফট সেভ',
    submit: 'জমা দিন',
    myTrackingCards: 'আমার ট্র্যাকিং কার্ড',
    inReview: 'পর্যালোচনায়',
    assigned: 'বরাদ্দকৃত',
    draftSaved: 'ড্রাফট সেভ হয়েছে!',
    draftLoaded: 'ড্রাফট লোড হয়েছে',
    noDraft: 'কোনো সেভ করা ড্রাফট নেই',

    // Legal Aid
    legalAidTitle: 'আইনি সহায়তা ডিরেক্টরি',
    legalAidDesc: 'বাংলাদেশে বিনামূল্যে ও ভর্তুকিযুক্ত আইনি সহায়তা সেবা',
    callNow: 'এখনই কল করুন',
    visitWebsite: 'ওয়েবসাইট দেখুন',
    nationalHelpline: 'জাতীয় হেল্পলাইন',

    // RTI
    rtiTitle: 'তথ্য অধিকার',
    rtiDesc: 'তথ্য অধিকার আইন ২০০৯ এর অধীনে যেকোনো সরকারি কর্তৃপক্ষের কাছে তথ্য চাওয়ার অধিকার',
    step: 'ধাপ',
    rtiTemplate: 'তথ্য অধিকার আবেদন টেমপ্লেট',
    copyTemplate: 'টেমপ্লেট কপি করুন',
    templateCopied: 'টেমপ্লেট কপি হয়েছে!',

    // Evidence Vault & Detail
    evidenceVault: 'প্রমাণ ভল্ট',
    evidenceVaultTitle: 'প্রমাণ ভল্ট',
    evidenceVaultDesc: 'সংরক্ষিত রেকর্ড পর্যালোচনা করুন, হ্যাশ পরীক্ষা করুন এবং নিরাপদে ফাইল শেয়ার করুন।',
    savedEvidence: 'সংরক্ষিত প্রমাণ',
    evidenceDetails: 'প্রমাণের বিবরণ',
    evidenceDetailTitle: 'প্রমাণের বিস্তারিত বিবরণ',
    typeLabel: 'ধরন',
    dateLabel: 'তারিখ',
    noteLabel: 'নোট',
    hashLabel: 'অখণ্ডতা হ্যাশ',
    latitudeLabel: 'অক্ষাংশ',
    longitudeLabel: 'দ্রাঘিমাংশ',
    shareEvidence: 'শেয়ার / ক্লাউডে সেভ করুন',
    noEvidenceFound: 'এখনো কোনো প্রমাণ সংরক্ষণ করা হয়নি।',
    openEvidenceVault: 'প্রমাণ ভল্ট খুলুন',
    recordingSaved: 'রেকর্ডিং স্থানীয় ভল্টে সেভ করা হয়েছে!',
    recordingError: 'রেকর্ডিং সেভ করতে সমস্যা হয়েছে।',
    viewFullDetails: 'বিস্তারিত দেখুন এবং প্লে করুন',
    deleteEvidence: 'প্রমাণ মুছে ফেলুন',
    confirmDelete: 'আপনি কি নিশ্চিতভাবে এই প্রমাণটি চিরতরে মুছে ফেলতে চান?',
    microphonePermission: 'রেকর্ডিংয়ে অডিওর জন্য মাইক্রোফোন অনুমতি প্রয়োজন।',
    playEvidence: 'প্রমাণ প্লে করুন',
    cancel: 'বাতিল',
    delete: 'মুছে ফেলুন',
  },
};

/**
 * Returns the string map for the given language code.
 * @param {'EN' | 'BN'} lang
 */
export const getStrings = (lang) => STRINGS[lang] || STRINGS.EN;

export default STRINGS;
