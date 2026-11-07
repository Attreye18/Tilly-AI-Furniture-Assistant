import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Helper to remove any rogue HTML tags and format linebreaks cleanly
function formatMessageContent(text) {
  if (!text) return "";
  return text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/(?:[\r\n\t ]+)?•(?:[\t ])*/g, '\n\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Cute Robotic Teapot Mascot Component
function TillyRobotTeapot({ size = "normal" }) {
  const isLarge = size === "large";
  const dim = isLarge ? "w-28 h-28 md:w-36 md:h-36" : "w-9 h-9";

  return (
    <div className={`relative flex items-center justify-center animate-float ${dim}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md overflow-visible">
        <ellipse cx="100" cy="175" rx="35" ry="10" fill="none" stroke="#D2B48C" strokeWidth="2.5" strokeDasharray="6 4" className="animate-spin" style={{ animationDuration: '6s' }} />
        <path
          d="M 50,110 C 35,80 50,55 85,55 C 120,55 150,75 150,110 C 150,145 125,162 100,162 C 75,162 55,140 50,110 Z"
          fill="url(#robotCeramicGradient)"
          stroke="#8B5A2B"
          strokeWidth="3.5"
        />
        <path d="M 75,55 C 75,42 88,32 100,32 C 112,32 125,42 125,55 Z" fill="#8B5A2B" stroke="#D2B48C" strokeWidth="2" />
        <circle cx="100" cy="24" r="5" fill="#00FFCC" className="animate-ping" />
        <circle cx="100" cy="24" r="4" fill="#00FFCC" />
        <path d="M 55,88 C 30,85 22,70 28,58 C 32,52 42,60 48,72" fill="url(#robotCeramicGradient)" stroke="#8B5A2B" strokeWidth="3" />
        <rect x="25" y="55" width="5" height="4" rx="2" fill="#00FFCC" />
        <path d="M 144,88 C 170,90 170,125 144,138" fill="none" stroke="#8B5A2B" strokeWidth="6" strokeLinecap="round" />
        <rect x="70" y="78" width="60" height="36" rx="10" fill="#2C2A29" stroke="#8B5A2B" strokeWidth="2.5" />
        <path d="M 82,92 Q 87,86 92,92" fill="none" stroke="#00FFCC" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 108,92 Q 113,86 118,92" fill="none" stroke="#00FFCC" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="90" y1="104" x2="110" y2="104" stroke="#D2B48C" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="95" y1="108" x2="105" y2="108" stroke="#D2B48C" strokeWidth="2" strokeLinecap="round" />
        <circle cx="85" cy="135" r="3" fill="#FFD700" className="animate-pulse" />
        <circle cx="100" cy="135" r="3" fill="#00FFCC" className="animate-pulse" />
        <circle cx="115" cy="135" r="3" fill="#FF69B4" className="animate-pulse" />
        <defs>
          <linearGradient id="robotCeramicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F5F0EB" />
            <stop offset="100%" stopColor="#E6DDD3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); 
  const [messages, setMessages] = useState([
    { sender: 'tilly', text: "Beep boop! Welcome! I'm Tilly, your robotic teapot assistant. Ask me to find comfortable beds, stylish tables, or storage ideas! 🤖🫖✨" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [topSearch, setTopSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  // Floating Assistant state (starts collapsed in bottom-right)
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Stylist state
  const [budget, setBudget] = useState(35000);
  const [roomType, setRoomType] = useState('Living room');
  const [recommendations, setRecommendations] = useState([]);

  // Wishlist, Compare, Recently Viewed
  const [wishlist, setWishlist] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Booking Modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [bookingsList, setBookingsList] = useState([]);
  const [successAnim, setSuccessAnim] = useState(false);
  const [lastBookingRef, setLastBookingRef] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    fetchInitialProducts();
    fetchBookings();
  }, []);

  const fetchInitialProducts = async () => {
    try {
      const res = await axios.post(`${API_BASE}/recommendations`, { message: "cozy modern furniture", room_type: "Living room" });
      setAllProducts(res.data.recommendations || []);
    } catch (err) {
      console.error("Failed to load initial products", err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsThinking(true);
    setIsChatOpen(true); // Auto-open floating chat if triggered

    try {
      const res = await axios.post(`${API_BASE}/chat`, { message: text });
      setMessages(prev => [...prev, { sender: 'tilly', text: res.data.reply }]);
      if (res.data.products) {
        setProducts(res.data.products);
        setRecentlyViewed(prev => [...res.data.products, ...prev].slice(0, 10));
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'tilly', text: "Beep boop! My circuits are a bit scrambled! Please check if my backend server is running." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleTopSearchSubmit = (e) => {
    e.preventDefault();
    if (!topSearch.trim()) return;
    handleSendMessage(topSearch);
    setTopSearch('');
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/recommendations`, { message: roomType, budget: Number(budget), room_type: roomType });
      setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/bookings`);
      setBookingsList(res.data.bookings);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWishlist = (product) => {
    if (wishlist.some(item => item.item_id === product.item_id)) {
      setWishlist(wishlist.filter(item => item.item_id !== product.item_id));
    } else {
      setWishlist([...wishlist, product]);
    }
  };

  const toggleCompare = (product) => {
    if (compareList.some(item => item.item_id === product.item_id)) {
      setCompareList(compareList.filter(item => item.item_id !== product.item_id));
    } else {
      if (compareList.length >= 3) {
        alert("You can compare up to 3 items at a time.");
        return;
      }
      setCompareList([...compareList, product]);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !customerName) return;

    try {
      const res = await axios.post(`${API_BASE}/bookings`, {
        item_id: selectedProduct.item_id,
        item_name: selectedProduct.name,
        price: selectedProduct.price,
        customer_name: customerName,
        room_type: roomType
      });

      if (res.data.success) {
        setLastBookingRef(res.data.booking_ref);
        setSuccessAnim(true);
        setTimeout(() => {
          setSuccessAnim(false);
          setBookingModalOpen(false);
          setSelectedProduct(null);
          setCustomerName('');
          fetchBookings();
        }, 3500);
      }
    } catch (err) {
      alert("Booking failed. Please try again.");
    }
  };

  const cancelBooking = async (ref) => {
    try {
      await axios.delete(`${API_BASE}/bookings/${ref}`);
      fetchBookings();
    } catch (err) {
      alert("Failed to cancel booking.");
    }
  };

  const categoryPills = [
    { label: "Offers", icon: "🏷️", query: "festive offers discounts" },
    { label: "Storage & organisation", img: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=120&q=80", query: "wardrobe shelf storage" },
    { label: "Sofas & armchairs", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=120&q=80", query: "sofa armchair seating" },
    { label: "Office furniture & gaming", img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=120&q=80", query: "office desk gaming chair" },
    { label: "Beds & mattresses", img: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=120&q=80", query: "bed mattress headboard" },
    { label: "Tables & chairs", img: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=120&q=80", query: "dining table chair set" },
    { label: "Home decor", img: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=120&q=80", query: "lighting plant mirror rug" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3D2C1E] flex flex-col font-sans selection:bg-[#FFDB00] selection:text-[#111]">
      
      {/* 1. TOP UTILITY ANNOUNCEMENT BAR (IKEA STYLE) */}
      <div className="bg-[#111111] text-white text-xs px-6 py-2 flex items-center justify-between border-b border-[#222]">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1 hover:underline cursor-pointer">
            <span>🌐</span>
            <span className="font-semibold">IN | English</span>
          </span>
          <span className="hidden md:inline-block text-neutral-400">|</span>
          <span className="hidden md:inline-flex items-center space-x-1 text-[#FFDB00] font-medium">
            <span>🏷️ Festive offer - Up to 40% off*</span>
          </span>
        </div>
        <div className="flex items-center space-x-5 text-neutral-300">
          <span className="hover:text-white cursor-pointer flex items-center space-x-1">
            <span>📍</span>
            <span className="hidden sm:inline">Enter postal code</span>
          </span>
          <span className="hover:text-white cursor-pointer flex items-center space-x-1">
            <span>🏬</span>
            <span className="hidden sm:inline">Select store</span>
          </span>
        </div>
      </div>

      {/* 2. MAIN IKEA HEADER BAR */}
      <header className="bg-white border-b border-[#E6DDD3] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Authentic IKEA Logo & Primary Links */}
          <div className="flex items-center space-x-6">
            <button onClick={() => setActiveTab('home')} className="flex items-center focus:outline-none" title="IKEA Home">
              <svg className="w-20 md:w-24 h-8 md:h-10" viewBox="0 0 100 40" fill="none">
                <rect width="100" height="40" fill="#0058A3" rx="2" />
                <ellipse cx="50" cy="20" rx="46" ry="17" fill="#FFDB00" />
                <text x="50" y="27" fontSize="22" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" fill="#0058A3" textAnchor="middle" letterSpacing="1">IKEA</text>
              </svg>
            </button>

            <nav className="hidden lg:flex items-center space-x-6 text-sm font-semibold text-[#111]">
              <button onClick={() => setActiveTab('explore')} className={`hover:text-[#0058A3] transition ${activeTab === 'explore' ? 'text-[#0058A3] underline underline-offset-8' : ''}`}>Products</button>
              <button onClick={() => { setActiveTab('stylist'); }} className={`hover:text-[#0058A3] transition ${activeTab === 'stylist' ? 'text-[#0058A3] underline underline-offset-8' : ''}`}>Rooms & Stylist</button>
              <button onClick={() => { setActiveTab('explore'); handleSendMessage("Show me offers and deals"); }} className="hover:text-[#0058A3] transition">Offers</button>
              <button onClick={() => { setActiveTab('compare'); }} className={`hover:text-[#0058A3] transition ${activeTab === 'compare' ? 'text-[#0058A3] underline underline-offset-8' : ''}`}>Compare</button>
              <button onClick={() => setActiveTab('bookings')} className={`hover:text-[#0058A3] transition ${activeTab === 'bookings' ? 'text-[#0058A3] underline underline-offset-8' : ''}`}>My Bookings ({bookingsList.length})</button>
            </nav>
          </div>

          {/* Search Bar with Camera Icon */}
          <form onSubmit={handleTopSearchSubmit} className="flex-1 max-w-xl mx-2 relative">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-neutral-400">🔍</span>
              <input
                type="text"
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                placeholder="What are you looking for?"
                className="w-full pl-11 pr-12 py-2.5 bg-[#F5F5F5] hover:bg-[#EBEBEB] focus:bg-white border border-transparent focus:border-neutral-400 rounded-full text-sm outline-none transition"
              />
              <button type="button" onClick={() => { setIsChatOpen(true); }} className="absolute right-3.5 p-1 text-neutral-500 hover:text-black" title="Search with Tilly">
                📷
              </button>
            </div>
          </form>

          {/* User Utility Icons (Right) */}
          <div className="flex items-center space-x-4 md:space-x-5 text-sm text-[#111] font-semibold">
            <button onClick={() => setActiveTab('settings')} className="hidden sm:flex items-center space-x-1.5 hover:text-[#0058A3]">
              <span className="text-base">👤</span>
              <span className="text-xs">Hej! Log in</span>
            </button>
            <button onClick={() => setActiveTab('wishlist')} className="relative p-1 hover:text-[#0058A3]" title="Wishlist">
              <span className="text-xl">🤍</span>
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#0058A3] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab('bookings')} className="relative p-1 hover:text-[#0058A3]" title="Bookings & Bag">
              <span className="text-xl">🛍️</span>
              {bookingsList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8B5A2B] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {bookingsList.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. SCROLLABLE CATEGORY PILLS BAR (LIKE IKEA) */}
        <div className="border-t border-[#F0EAE1] bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center space-x-3 overflow-x-auto scrollbar-none">
            {categoryPills.map((pill, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveTab('explore');
                  handleSendMessage(`Show items for ${pill.label}`);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-[#F5F5F5] hover:bg-[#EAEAEA] border border-[#E6DDD3] rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-2xs"
              >
                {pill.icon ? (
                  <span className="text-base">{pill.icon}</span>
                ) : (
                  <img src={pill.img} alt={pill.label} className="w-6 h-6 rounded-full object-cover" />
                )}
                <span>{pill.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 4. MAIN SCROLLABLE CONTENT BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-y-auto">

        {/* HOME VIEW: AUTHENTIC SCROLLABLE EDITORIAL IKEA HOMEPAGE */}
        {activeTab === 'home' && (
          <div className="space-y-10">
            
            {/* HERO PROMO GRID (Yellow Block + Aesthetic Photography Matching Screenshot) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left Yellow IKEA Festive Banner */}
              <div className="lg:col-span-5 bg-[#FFDB00] p-8 md:p-12 rounded-2xl flex flex-col justify-between shadow-xs relative overflow-hidden">
                <div className="z-10">
                  <span className="inline-block bg-black text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                    IKEA Festive Edition
                  </span>
                  <h1 className="text-5xl md:text-6xl font-black text-[#111] tracking-tight leading-none mb-3">
                    Up to<br />50% off*
                  </h1>
                  <p className="text-sm font-semibold text-[#333] max-w-sm mt-3">
                    Bring home iconic Scandinavian furniture, soft textiles, and smart storage made for every celebration.
                  </p>
                </div>

                <div className="pt-8 z-10 flex gap-3">
                  <button 
                    onClick={() => { setActiveTab('explore'); }}
                    className="bg-[#111] text-white hover:bg-neutral-800 px-6 py-3 rounded-full text-xs font-bold transition flex items-center space-x-2"
                  >
                    <span>Shop Offers</span>
                    <span>→</span>
                  </button>
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="bg-white text-[#111] hover:bg-neutral-100 px-5 py-3 rounded-full text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
                  >
                    <span>🤖 Ask Tilly</span>
                  </button>
                </div>
              </div>

              {/* Right Side Editorial Room Aesthetic Photogrid */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Photo 1: Natural Bedroom with Rattan & Indoor Greens */}
                <div 
                  onClick={() => { setActiveTab('explore'); handleSendMessage("Show me cozy beds and nightstands"); }}
                  className="relative group rounded-2xl overflow-hidden cursor-pointer h-64 md:h-80 shadow-xs"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80" 
                    alt="Bedsheets, cushions & more" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-sm font-bold leading-tight">Up to 40% off* on Bed frames, cushions & nightstands</span>
                    <span className="text-xs text-neutral-300 mt-1 flex items-center space-x-1">
                      <span>Explore bedrooms</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>

                {/* Photo 2: Dining & Cookware Aesthetic */}
                <div 
                  onClick={() => { setActiveTab('explore'); handleSendMessage("Show me dining tables and chairs"); }}
                  className="relative group rounded-2xl overflow-hidden cursor-pointer h-64 md:h-80 shadow-xs"
                >
                  <img 
                    src="https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80" 
                    alt="Cookware and dinnerware" 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-sm font-bold leading-tight">Up to 40% off* on Solid Wood Dining & Bar Tables</span>
                    <span className="text-xs text-neutral-300 mt-1 flex items-center space-x-1">
                      <span>Explore dining</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* CURATED POPULAR PRODUCTS */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#111]">Popular IKEA Furniture Picks</h2>
                  <p className="text-xs text-[#7A6B5D]">Grounded directly from our indexed store catalog</p>
                </div>
                <button onClick={() => setActiveTab('explore')} className="text-xs font-bold text-[#0058A3] hover:underline">
                  View All Products ({allProducts.length}) →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {allProducts.slice(0, 8).map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#E6DDD3] rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F5F0EB] text-[#8B5A2B] px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                        <button onClick={() => toggleWishlist(item)} className="text-lg">
                          {wishlist.some(w => w.item_id === item.item_id) ? '❤️' : '🤍'}
                        </button>
                      </div>
                      <h3 className="font-bold text-sm text-[#111]">{item.name}</h3>
                      <p className="text-xs text-[#7A6B5D] mt-1 line-clamp-2 leading-relaxed">{item.short_description}</p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#F0EAE1] flex items-center justify-between">
                      <span className="text-base font-extrabold text-[#111]">₹{item.price}</span>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => toggleCompare(item)}
                          className="bg-[#F5F0EB] hover:bg-[#E6DDD3] text-[#7A6B5D] px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                        >
                          Compare
                        </button>
                        <button 
                          onClick={() => { setSelectedProduct(item); setBookingModalOpen(true); }}
                          className="bg-[#0058A3] hover:bg-[#004785] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECOND EDITORIAL INSPIRATION BANNER */}
            <div className="relative rounded-3xl overflow-hidden min-h-[300px] flex items-center p-8 md:p-12 shadow-xs border border-[#E6DDD3]">
              <img 
                src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=80" 
                alt="Cozy Living Space" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent pointer-events-none" />
              <div className="relative z-10 max-w-md text-white space-y-3">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#FFDB00]">Interior Inspiration</span>
                <h3 className="text-3xl font-extrabold leading-tight">Design spaces with warmth and intelligence.</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Need help measuring, styling, or matching colors for your apartment? Tilly is available 24/7 to curate furniture matching your exact room budget.
                </p>
                <button 
                  onClick={() => setIsChatOpen(true)}
                  className="bg-[#FFDB00] text-black font-extrabold px-5 py-2.5 rounded-full text-xs transition hover:bg-yellow-400 mt-2 flex items-center space-x-2"
                >
                  <span>Chat with Tilly AI</span>
                  <span>✨</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* EXPLORE CATALOG VIEW */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#111]">Explore IKEA Furniture Catalog</h2>
                <p className="text-xs text-[#7A6B5D]">Browse our 3,694+ dataset items with live booking and comparison.</p>
              </div>
              <button onClick={() => setIsChatOpen(true)} className="bg-[#0058A3] text-white text-xs font-bold px-4 py-2 rounded-full">
                Ask Tilly to filter 🤖
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {allProducts.map((item, idx) => (
                <div key={idx} className="bg-white border border-[#E6DDD3] rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#D2B48C] text-[#3D2C1E] px-2 py-0.5 rounded">{item.category}</span>
                      <button onClick={() => toggleWishlist(item)} className="text-lg">
                        {wishlist.some(w => w.item_id === item.item_id) ? '❤️' : '🤍'}
                      </button>
                    </div>
                    <h3 className="font-bold text-base text-[#111]">{item.name}</h3>
                    <p className="text-xs text-[#7A6B5D] mt-1 line-clamp-2">{item.short_description}</p>
                    <p className="text-[11px] text-[#7A6B5D] mt-2 font-medium">Designer: {item.designer}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between pt-3 border-t border-[#E6DDD3]">
                    <span className="text-base font-extrabold text-[#111]">₹{item.price}</span>
                    <div className="flex space-x-1.5">
                      <button 
                        onClick={() => toggleCompare(item)}
                        className="bg-[#F5F0EB] hover:bg-[#E6DDD3] text-[#7A6B5D] px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                      >
                        Compare
                      </button>
                      <button 
                        onClick={() => { setSelectedProduct(item); setBookingModalOpen(true); }}
                        className="bg-[#0058A3] hover:bg-[#004785] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROOM STYLIST VIEW */}
        {activeTab === 'stylist' && (
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#E6DDD3] p-8 shadow-xs space-y-6">
            <div className="flex items-center space-x-3">
              <TillyRobotTeapot size="small" />
              <div>
                <h2 className="text-2xl font-bold text-[#111]">AI Personal Furniture Stylist ✨</h2>
                <p className="text-xs text-[#7A6B5D]">Curate a coordinated IKEA room package tailored to your exact budget.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B5D] mb-2">Room Type</label>
                <select 
                  value={roomType} 
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full p-3.5 bg-[#F5F0EB] border border-[#E6DDD3] rounded-xl text-sm focus:outline-none"
                >
                  <option value="Living room">Living Room</option>
                  <option value="Bedroom">Bedroom</option>
                  <option value="Office">Home Office</option>
                  <option value="Dining">Dining Room</option>
                  <option value="Outdoor">Outdoor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B5D] mb-2">Maximum Budget (₹): {budget}</label>
                <input 
                  type="range" 
                  min="5000" 
                  max="150000" 
                  step="2500"
                  value={budget} 
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full accent-[#0058A3] mt-3"
                />
              </div>
            </div>

            <button 
              onClick={fetchRecommendations}
              className="w-full bg-[#0058A3] hover:bg-[#004785] text-white py-3.5 rounded-xl font-bold text-sm transition shadow-sm"
            >
              Curate Room Package ✨
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
              {recommendations.map((item, idx) => (
                <div key={idx} className="bg-[#F5F0EB] border border-[#E6DDD3] p-4 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#D2B48C] text-[#3D2C1E] rounded-md">{item.category}</span>
                    <h3 className="font-bold text-sm mt-2 text-[#3D2C1E]">{item.name}</h3>
                    <p className="text-xs text-[#7A6B5D] mt-1 line-clamp-2">{item.short_description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#E6DDD3]">
                    <span className="text-sm font-extrabold text-[#8B5A2B]">₹{item.price}</span>
                    <button 
                      onClick={() => { setSelectedProduct(item); setBookingModalOpen(true); }}
                      className="bg-[#0058A3] text-white px-3 py-1 rounded-lg text-xs font-bold"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WISHLIST VIEW */}
        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#111]">My Saved Wishlist ❤️</h2>
            {wishlist.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#E6DDD3]">
                <p className="text-4xl mb-2">🤍</p>
                <p className="font-bold text-sm text-[#111]">Your wishlist is empty.</p>
                <p className="text-xs text-[#7A6B5D] mt-1">Tap the heart on any product card to save it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {wishlist.map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#E6DDD3] rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase bg-[#D2B48C] px-2 py-0.5 rounded">{item.category}</span>
                        <button onClick={() => toggleWishlist(item)}>❤️</button>
                      </div>
                      <h3 className="font-bold text-base text-[#111]">{item.name}</h3>
                      <p className="text-xs text-[#7A6B5D] mt-1 line-clamp-2">{item.short_description}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between pt-3 border-t border-[#E6DDD3]">
                      <span className="text-base font-extrabold text-[#111]">₹{item.price}</span>
                      <button 
                        onClick={() => { setSelectedProduct(item); setBookingModalOpen(true); }}
                        className="bg-[#0058A3] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPARE VIEW */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#111]">Product Comparison ⚖️</h2>
            {compareList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#E6DDD3]">
                <p className="text-4xl mb-2">⚖️</p>
                <p className="font-bold text-sm text-[#111]">No products selected for comparison.</p>
                <p className="text-xs text-[#7A6B5D] mt-1">Click "Compare" on product cards to view side-by-side specs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {compareList.map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#E6DDD3] rounded-2xl p-6 shadow-2xs relative">
                    <button 
                      onClick={() => setCompareList(compareList.filter(i => i.item_id !== item.item_id))}
                      className="absolute top-4 right-4 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg"
                    >
                      Remove
                    </button>
                    <span className="text-[10px] font-bold uppercase bg-[#D2B48C] px-2 py-0.5 rounded">{item.category}</span>
                    <h3 className="font-bold text-lg mt-3 text-[#111]">{item.name}</h3>
                    <p className="text-xs text-[#7A6B5D] mt-2 leading-relaxed">{item.short_description}</p>
                    <div className="mt-4 space-y-2 text-xs text-[#7A6B5D] border-t border-b border-[#E6DDD3] py-4">
                      <p><strong>Designer:</strong> {item.designer}</p>
                      <p><strong>Online Purchase:</strong> {item.sellable_online ? 'Yes' : 'In-store only'}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-lg font-extrabold text-[#111]">₹{item.price}</span>
                      <button 
                        onClick={() => { setSelectedProduct(item); setBookingModalOpen(true); }}
                        className="bg-[#0058A3] text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS VIEW */}
        {activeTab === 'bookings' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-[#111]">My Booked Demo Appointments 📋</h2>
            {bookingsList.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-[#E6DDD3]">
                <p className="text-4xl mb-2">📋</p>
                <p className="font-bold text-sm text-[#111]">No reservations found yet.</p>
                <p className="text-xs text-[#7A6B5D] mt-1">Reserve any piece from the catalog or through Tilly AI.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingsList.map((b, idx) => (
                  <div key={idx} className="bg-white border border-[#E6DDD3] p-5 rounded-2xl flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="font-mono text-xs font-bold bg-[#0058A3] text-white px-2.5 py-1 rounded-lg">{b.booking_ref}</span>
                      <h3 className="font-bold text-base mt-2.5 text-[#111]">{b.item_name}</h3>
                      <p className="text-xs text-[#7A6B5D] mt-1">Customer: <strong>{b.customer_name}</strong> | Room: <strong>{b.room_type}</strong> | <strong className="text-[#0058A3]">₹{b.price}</strong></p>
                    </div>
                    <button 
                      onClick={() => cancelBooking(b.booking_ref)}
                      className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* 5. FLOATING TILLY WIDGET (BOTTOM-RIGHT CORNER) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {/* COLLAPSED FLOATING BUTTON */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="group flex items-center space-x-3 bg-white hover:bg-[#FDFBF7] text-[#111] pl-3 pr-5 py-2.5 rounded-full shadow-2xl border-2 border-[#E6DDD3] transition transform hover:scale-105"
          >
            <div className="w-10 h-10 flex-shrink-0">
              <TillyRobotTeapot size="small" />
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-[#8B5A2B]">Chat with Tilly</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-[#7A6B5D]">Your IKEA AI Companion</p>
            </div>
          </button>
        )}

        {/* EXPANDED FULL CHAT MODAL (SAME AS THE SYSTEM SHOWED PREVIOUSLY) */}
        {isChatOpen && (
          <div className="w-[92vw] sm:w-[500px] md:w-[680px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-[#E6DDD3] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-[#F5F0EB] border-b border-[#E6DDD3] px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9">
                  <TillyRobotTeapot size="small" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#8B5A2B] flex items-center space-x-1.5">
                    <span>Tilly AI Assistant</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.2 rounded-full">Online</span>
                  </h3>
                  <p className="text-[10px] text-[#7A6B5D]">Grounded in 3,694 IKEA products</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-black rounded-lg hover:bg-[#E6DDD3]" 
                  title="Minimize"
                >
                  —
                </button>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-black rounded-lg hover:bg-[#E6DDD3]" 
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Split Body: Messages (Left) + Top Picks Showcase (Right on tablets/desktops) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col bg-[#FDFBF7]/60">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {msg.sender === 'tilly' ? (
                        <div className="w-8 h-8 flex-shrink-0">
                          <TillyRobotTeapot size="small" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#D2B48C] text-[#3D2C1E] text-xs font-bold flex items-center justify-center flex-shrink-0">
                          You
                        </div>
                      )}
                      <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-xs whitespace-pre-line ${msg.sender === 'user' ? 'bg-[#8B5A2B] text-white rounded-tr-none' : 'bg-white text-[#3D2C1E] border border-[#E6DDD3] rounded-tl-none'}`}>
                        {formatMessageContent(msg.text)}
                      </div>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex items-center space-x-2 text-xs text-[#7A6B5D] bg-white p-2.5 rounded-xl border border-[#E6DDD3] w-fit">
                      <span className="animate-spin">🫖</span>
                      <span>Tilly is thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Prompts */}
                <div className="px-3 py-2 bg-white border-t border-[#E6DDD3] flex gap-1.5 overflow-x-auto scrollbar-none">
                  {["Cozy armchairs", "Wooden dining table", "Affordable bookcases", "Modern beds"].map((prompt, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="whitespace-nowrap px-2.5 py-1 bg-[#F5F0EB] hover:bg-[#8B5A2B] hover:text-white border border-[#E6DDD3] rounded-full text-[11px] font-medium text-[#7A6B5D] transition"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-white border-t border-[#E6DDD3] flex items-center space-x-2">
                  <input 
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask Tilly about beds, sofas, lamps..."
                    className="flex-1 px-3.5 py-2.5 bg-[#F5F0EB] border border-[#E6DDD3] rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    className="bg-[#8B5A2B] hover:bg-[#704721] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs"
                  >
                    Send 🤖
                  </button>
                </div>
              </div>

              {/* RAG Matching Products Sidebar (visible if products exist) */}
              {products.length > 0 && (
                <div className="hidden sm:flex flex-col w-60 border-l border-[#E6DDD3] bg-white p-3 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#8B5A2B]">Top Matches</span>
                    <span className="text-[10px] bg-[#D2B48C]/30 text-[#8B5A2B] px-1.5 py-0.5 rounded font-semibold">Grounded</span>
                  </div>
                  <div className="space-y-2.5 flex-1">
                    {products.map((p, idx) => (
                      <div key={idx} className="bg-[#F5F0EB] border border-[#E6DDD3] rounded-xl p-2.5 text-xs flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-bold bg-[#D2B48C] text-[#3D2C1E] px-1.5 py-0.5 rounded uppercase">{p.category}</span>
                          <h5 className="font-bold text-[#111] mt-1 line-clamp-1">{p.name}</h5>
                          <p className="text-[11px] text-[#7A6B5D] line-clamp-2">{p.short_description}</p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-[#E6DDD3] flex items-center justify-between">
                          <span className="font-bold text-[#8B5A2B]">₹{p.price}</span>
                          <button 
                            onClick={() => { setSelectedProduct(p); setBookingModalOpen(true); }}
                            className="bg-[#0058A3] text-white px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* 6. BOOKING APPOINTMENT MODAL */}
      {bookingModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            {successAnim ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 mx-auto">
                  <TillyRobotTeapot size="small" />
                </div>
                <h3 className="text-2xl font-bold text-[#0058A3]">Demo Booked!</h3>
                <p className="text-xs text-[#7A6B5D]">Your booking reference is <strong className="text-[#111]">{lastBookingRef}</strong></p>
                <p className="text-xs text-emerald-600 font-semibold">Tilly is doing a celebratory dance!</p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[#111]">Book IKEA Item Demo</h3>
                  <button onClick={() => setBookingModalOpen(false)} className="text-[#7A6B5D] hover:text-black font-bold">✕</button>
                </div>
                {selectedProduct && (
                  <div className="bg-[#F5F0EB] p-3.5 rounded-xl mb-4 border border-[#E6DDD3]">
                    <h4 className="font-bold text-sm text-[#111]">{selectedProduct.name}</h4>
                    <p className="text-xs text-[#7A6B5D] mt-0.5">{selectedProduct.short_description}</p>
                    <p className="text-sm font-extrabold text-[#0058A3] mt-2">₹{selectedProduct.price}</p>
                  </div>
                )}
                <form onSubmit={handleBookSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B5D] mb-1">Your Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full p-3 bg-[#F5F0EB] border border-[#E6DDD3] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0058A3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#7A6B5D] mb-1">Room Destination</label>
                    <select 
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="w-full p-3 bg-[#F5F0EB] border border-[#E6DDD3] rounded-xl text-xs outline-none"
                    >
                      <option value="Living room">Living Room</option>
                      <option value="Bedroom">Bedroom</option>
                      <option value="Office">Home Office</option>
                      <option value="Dining">Dining Room</option>
                      <option value="Outdoor">Outdoor</option>
                    </select>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setBookingModalOpen(false)}
                      className="flex-1 bg-[#F5F0EB] hover:bg-[#E6DDD3] text-[#7A6B5D] py-2.5 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-[#0058A3] hover:bg-[#004785] text-white py-2.5 rounded-xl text-xs font-bold shadow-xs"
                    >
                      Confirm Booking
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
