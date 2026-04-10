// ==========================================
// 1. THE UTILITIES (Safety First)
// ==========================================

const convertBanglaToEnglish = (text) => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let converted = text;
  banglaDigits.forEach((digit, index) => {
    const regex = new RegExp(digit, 'g');
    converted = converted.replace(regex, englishDigits[index]);
  });
  return converted;
};

const cleanInput = (text) => {
  let clean = text;

  // 1. Remove Labels (Only if followed by : or -)
  // Matches: "Name:", "Name-", "Mobile :", "Address :"
  clean = clean.replace(/\b(Name|Address|Mobile|Phone|Contact|To|From|প্রাপক|প্রতি|ঠিকানা|মোবাইল)\s*[:\-\.]+\s*/gi, "");

  // 2. Remove Greetings (STRICT WHOLE WORDS ONLY)
  // \b ensures we don't delete "Hi" from "Shino" or "To" from "Tomal"
  const greetings = [
    "Hello", "Hi", "Hey", "Assalamu Alaikum", "Salam", 
    "Order", "Plz", "Please", "Need", "Delivery", "Cod"
  ];
  
  // Create a safe Regex: /\b(Hello|Hi|...)\b/gi
  const greetingRegex = new RegExp(`\\b(${greetings.join('|')})\\b`, 'gi');
  clean = clean.replace(greetingRegex, "");

  // 3. Remove "Bhai/Bro" (Safe to remove globally in BD context)
  clean = clean.replace(/ভাই|Bro|Bhai/gi, "");

  // 4. Remove leading/trailing punctuation (commas, dots, dashes)
  clean = clean.replace(/^[\s,.\-]+|[\s,.\-]+$/g, "");

  return clean.trim();
};

// ==========================================
// 2. THE MASTER PARSER
// ==========================================

export const parseText = (rawText) => {
  if (!rawText) return { name: '', phone: '', address: '' };

  let workingText = convertBanglaToEnglish(rawText);

  // 1. PHONE SURGERY (Extract & Cut)
  let detectedPhone = "";
  // Regex for BD Phone: Optional +88, then 01, then 9 digits
  const phoneRegex = /(?:\+88)?01[3-9]\d{8}/; 
  const phoneMatch = workingText.match(phoneRegex);
  
  if (phoneMatch) {
    detectedPhone = phoneMatch[0];
    // Remove the phone number completely so it doesn't mess up address detection
    workingText = workingText.replace(detectedPhone, ""); 
  }

  const labelPatterns = [
    { nameKey: /(?:নাম|নামঃ)\s*[:\-]?\s*/i, 
      addrKey: /(?:ঠিকানা|ঠিকানাঃ)\s*[:\-]?\s*/i },
    { nameKey: /(?:name|customer|customer name)\s*[:\-]?\s*/i,
      addrKey: /(?:address|delivery address|delivery)\s*[:\-]?\s*/i }
  ];

  let labelDetectedName = "";
  let labelDetectedAddress = "";

  for (const pattern of labelPatterns) {
    const nameMatch = workingText.match(
      new RegExp(pattern.nameKey.source + 
      "([^\\n]+)", "i")
    );
    const addrMatch = workingText.match(
      new RegExp(pattern.addrKey.source + 
      "([^\\n]+)", "i")
    );

    if (nameMatch?.[1]) {
      labelDetectedName = 
        nameMatch[1].trim();
      workingText = workingText.replace(
        nameMatch[0], ""
      );
    }
    if (addrMatch?.[1]) {
      labelDetectedAddress = 
        addrMatch[1].trim();
      workingText = workingText.replace(
        addrMatch[0], ""
      );
    }
  }

  // 2. CLEAN UP (Run the safe cleaner)
  workingText = cleanInput(workingText);

  // 3. DEFINE ADDRESS KEYWORDS (The Map)
  const addressKeywords = [
    'road', 'house', 'sector', 'block', 'village', 'thana', 'district', 'dhaka', 
    'chittagong', 'sylhet', 'street', 'flat', 'floor', 'holding', 'market', 'bazar', 'hat',
    'goli', 'lane', 'avenue', 'upazila', 'union', 'area', 'zone',
    'রোড', 'রাস্তা', 'বাসা', 'বাড়ি', 'হোল্ডিং', 'সেক্টর', 'ব্লক', 'লেন', 'গলি',
    'থানা', 'জেলা', 'গ্রাম', 'ডাকঘর', 'পোস্ট', 'ফ্লোর', 'তলা', 'বাজার', 'হাট',
    'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'সিলেট', 'রংপুর', 'ময়মনসিংহ',
    'কুমিল্লা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'সাভার', 'কেরানীগঞ্জ', 'ফেনী', 'বগুড়া'
  ];

  let detectedName = "";
  let detectedAddress = "";

  const lines = workingText.split('\n').filter(line => line.trim().length > 0);

  // ==================================================
  // SCENARIO A: ONE-LINER (The Hardest Part)
  // "Shino Marma, Road 10, Dhaka"
  // ==================================================
  if (lines.length === 1) {
    const line = lines[0];
    let splitIndex = -1;

    // Strategy 1: Look for the FIRST Address Keyword
    for (let key of addressKeywords) {
      const idx = line.toLowerCase().indexOf(key);
      if (idx !== -1) {
        // We want the VERY FIRST keyword we find
        if (splitIndex === -1 || idx < splitIndex) {
          splitIndex = idx;
        }
      }
    }

    // Strategy 2: If no keyword, look for a Comma (Backup)
    // But ONLY if the comma is somewhat in the middle (not at index 0)
    if (splitIndex === -1 && line.includes(',')) {
      splitIndex = line.indexOf(',');
    }

    if (splitIndex !== -1) {
      // SPLIT IT!
      // Part 1 is Name, Part 2 is Address
      const part1 = line.substring(0, splitIndex).replace(/,|-/g, "").trim();
      const part2 = line.substring(splitIndex).replace(/^,/, "").trim(); // Remove leading comma
      
      // Safety: If "Name" is suspicious (has digits or is empty), swap or fix
      if (/\d/.test(part1) && !/\d/.test(part2)) {
         // Rare case: User typed Address first? We assume strict order Name -> Address
         detectedName = part1; 
         detectedAddress = part2;
      } else {
         detectedName = part1;
         detectedAddress = part2;
      }
    } else {
      // NO Keywords, NO Commas?
      // "Shino Marma Ratanpur"
      // This is risky. We assume shorter is name.
      if (line.length < 25) {
        detectedName = line.trim();
      } else {
        detectedAddress = line.trim(); 
      }
    }

  } else {
    // ==================================================
    // SCENARIO B: MULTI-LINE (Easier)
    // ==================================================
    for (let line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Is this line an address?
      // 1. Has keyword?
      const hasKeyword = addressKeywords.some(key => lowerLine.includes(key));
      // 2. Has digits (House 10)?
      const hasDigits = /\d/.test(line);

      // Logic: If it has keyword OR (Digits AND it's not the first line)
      if (hasKeyword || (hasDigits && lines.indexOf(line) > 0) || line.length > 30) {
        detectedAddress += (detectedAddress ? ", " : "") + line.trim();
      } else {
        // If we don't have a name yet, this is it.
        if (!detectedName) {
          detectedName = line.trim();
        } else {
          // We already have a name, so this must be part of address (e.g. "Near Mosque")
          detectedAddress += ", " + line.trim();
        }
      }
    }
  }

  return {
    name: labelDetectedName || detectedName,
    phone: detectedPhone,
    address: labelDetectedAddress || 
             detectedAddress
  };
};