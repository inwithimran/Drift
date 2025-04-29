const suggestionsData = [
  { text: "কীভাবে কোডিং শিখব?", icon: "code" },
  { text: "একটি মজার গল্প শোনান!", icon: "book" },
  { text: "একটি স্বাস্থ্যকর রেসিপি শেয়ার করুন", icon: "restaurant" },
  { text: "একটি বিজ্ঞানের মজার তথ্য বলুন", icon: "science" },
  { text: "বাংলাদেশের ইতিহাস সম্পর্কে বলুন", icon: "history" },
  { text: "একটি মজার জোকস্ শোনান!", icon: "book" },
  { text: "আমার দিনের পরিকল্পনা করতে সাহায্য করুন", icon: "calendar_today" },
  { text: "একটি কবিতা লিখে দিন", icon: "edit" },
  { text: "বিজ্ঞানের সাম্প্রতিক আবিষ্কার সম্পর্কে বলুন", icon: "science" },
  { text: "প্রোগ্রামিং শেখার টিপস দিন", icon: "code" },
  { text: "বাংলা সাহিত্যের একটি চরিত্র সম্পর্কে বলুন", icon: "theater_comedy" },
  { text: "আপনার প্রিয় বইয়ের গল্প শোনান", icon: "auto_stories" },
  { text: "সময় ব্যবস্থাপনার কৌশল শেয়ার করুন", icon: "schedule" },
  { text: "একটি ভ্রমণ গন্তব্যের পরামর্শ দিন", icon: "travel_explore" },
  { text: "গণিতের একটি সমস্যা সমাধান করতে সাহায্য করুন!", icon: "calculate" },
  { text: "একটি বাঙালি রেসিপি শেয়ার করুন", icon: "restaurant" },
  { text: "কীভাবে চাপ কমানো যায়?", icon: "self_improvement" },
  { text: "আজকের দিনে কোন সিনেমা দেখব?", icon: "movie" },
  { text: "একটি বাংলা কবিতা শোনান", icon: "auto_stories" },
  { text: "বাংলাদেশের জাতীয় পতাকার ইতিহাস কী?", icon: "flag" },
  { text: "একটি স্বাস্থ্যকর ডায়েট প্ল্যান দিন", icon: "health_and_safety" },
  { text: "বাংলা সাহিত্যের সেরা লেখক কারা?", icon: "library_books" },
  { text: "কীভাবে ইংরেজি শিখব?", icon: "language" },
  { text: "একটি ঐতিহ্যবাহী বাংলা গান শোনান", icon: "music_note" },
  { text: "কীভাবে সময় ব্যবস্থাপনা করব?", icon: "schedule" },
  { text: "বাংলাদেশের পর্যটন স্থানগুলো কী কী?", icon: "travel_explore" },
  { text: "একটি মোটিভেশনাল উক্তি শেয়ার করুন", icon: "lightbulb" },
  { text: "কীভাবে বাজেট তৈরি করব?", icon: "account_balance" },
  { text: "বাংলাদেশের জাতীয় ফুল কী?", icon: "local_florist" },
  { text: "একটি সহজ যোগব্যায়াম শেখান", icon: "self_improvement" },
  { text: "কীভাবে প্রেজেন্টেশন তৈরি করব?", icon: "slideshow" },
  { text: "বাংলা নাটকের ইতিহাস কী?", icon: "theater_comedy" },
  { text: "কীভাবে ফ্রিল্যান্সিং শুরু করব?", icon: "work" },
  { text: "বাংলাদেশের স্বাধীনতা দিবস কবে?", icon: "celebration" },
  { text: "একটি বাংলা প্রবাদ ব্যাখ্যা করুন", icon: "chat" },
  { text: "কীভাবে ছবি আঁকব?", icon: "brush" },
  { text: "বাংলাদেশের প্রধান নদীগুলো কী কী?", icon: "water" },
  { text: "একটি সহজ গেমের নিয়ম শেখান", icon: "games" },
  { text: "কীভাবে ভালো ছবি তুলব?", icon: "photo_camera" },
  { text: "বাংলাদেশের জাতীয় পাখি কী?", icon: "pets" },
  { text: "একটি বাংলা রূপকথার গল্প বলুন", icon: "book" },
  { text: "কীভাবে ওজন কমানো যায়?", icon: "fitness_center" },
  { text: "বাংলাদেশের প্রধান ফসল কী?", icon: "agriculture" },
  { text: "একটি দ্রুত ডেস্কটপ শর্টকাট শেখান", icon: "computer" },
  { text: "কীভাবে গাছ লাগাব?", icon: "park" },
  { text: "বাংলাদেশের প্রধান উৎসব কী কী?", icon: "festival" },
  { text: "একটি সহজ পড়াশোনার কৌশল বলুন", icon: "school" },
  { text: "কীভাবে ইউটিউব চ্যানেল শুরু করব?", icon: "videocam" },
  { text: "বাংলাদেশের জাতীয় খেলা কী?", icon: "sports_kabaddi" },
  { text: "একটি বাংলা লোকগান শোনান", icon: "music_note" },
  { text: "কীভাবে ভালো ঘুম হবে?", icon: "bed" },
  { text: "বাংলাদেশের প্রধান বন্দর কোথায়?", icon: "directions_boat" },
  { text: "একটি সহজ DIY প্রজেক্ট শেখান", icon: "build" },
  { text: "কীভাবে স্টক মার্কেট বুঝব?", icon: "trending_up" },
  { text: "বাংলাদেশের জাতীয় ফল কী?", icon: "nutrition" },
  { text: "একটি সহজ মেডিটেশন কৌশল বলুন", icon: "self_improvement" },
  { text: "কীভাবে ব্লগ লিখব?", icon: "article" }
];

function getRandomSuggestions(count = 4) {
  const shuffled = suggestionsData.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function populateSuggestions() {
  const suggestionList = document.querySelector(".suggestion-list");
  const suggestions = getRandomSuggestions();

  suggestionList.innerHTML = suggestions.map(suggestion => `
    <li class="suggestion">
      <span class="text">${suggestion.text}</span>
      <span class="icon material-symbols-rounded">${suggestion.icon}</span>
    </li>
  `).join('');
}

// Run on page load
document.addEventListener("DOMContentLoaded", populateSuggestions);