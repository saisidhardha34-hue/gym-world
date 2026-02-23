import React, { useState, useEffect, useRef } from 'react';
import { 
  Dumbbell, Flame, Activity, User, ChevronRight, 
  Play, Camera, CheckCircle, XCircle, AlertTriangle, 
  RotateCcw, Save, LogOut, History, Target, ArrowLeft, Mail, Smartphone
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'firebase/firestore';

// --- FIREBASE SETUP ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- MOCK DATA ---
const MUSCLES = ['Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Legs', 'Abs'];
const GOALS = ['Weightlifting', 'Powerlifting', 'Calisthenics', 'Weight Loss', 'Muscle Gain', 'Strength Training', 'Endurance Training'];

const INCOMPATIBLE_GOALS = [
  ['Weight Loss', 'Powerlifting'],
  ['Weight Loss', 'Muscle Gain'],
  ['Endurance Training', 'Powerlifting']
];

const WORKOUT_DB = {
  Chest: ['Incline Bench Press', 'Flat Bench Press', 'Decline Press', 'Cable Fly', 'Push Ups', 'Dumbbell Pullover', 'Pec Deck', 'Spoto Press', 'Svend Press', 'Floor Press'],
  Back: ['Pull Ups', 'Deadlift', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'T-Bar Row', 'Single Arm Row', 'Straight Arm Pulldown', 'Face Pulls', 'Good Mornings'],
  Biceps: ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Concentration Curl', 'Cable Curl', 'Spider Curl', 'Zottman Curl', 'Drag Curl', 'Incline Curl'],
  Triceps: ['Tricep Pushdown', 'Skullcrushers', 'Overhead Extension', 'Close Grip Bench', 'Dips', 'Kickbacks', 'Diamond Pushups', 'JM Press', 'Tate Press', 'Rope Pushdown'],
  Shoulders: ['Overhead Press', 'Lateral Raise', 'Front Raise', 'Reverse Pec Deck', 'Upright Row', 'Arnold Press', 'Face Pulls', 'Shrugs', 'Push Press', 'Cable Lateral Raise'],
  Legs: ['Squats', 'Leg Press', 'Lunges', 'Romanian Deadlift', 'Leg Extension', 'Leg Curl', 'Calf Raises', 'Bulgarian Split Squat', 'Hack Squat', 'Hip Thrust'],
  Abs: ['Crunches', 'Plank', 'Leg Raises', 'Russian Twists', 'Ab Wheel Rollout', 'Cable Crunch', 'Hanging Leg Raise', 'Bicycle Crunches', 'Decline Crunch', 'Woodchoppers']
};

// --- GLOBAL STYLES & ANIMATIONS ---
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes pageFadeInUp {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .page-transition {
      animation: pageFadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 4px; }
  `}} />
);

// --- SCREEN WRAPPER COMPONENT ---
// Defined outside App to prevent input focus loss
const ScreenWrapper = ({ children, title, showBack = true, onBack = null, currentScreen, toastMessage }) => (
  <>
    <GlobalStyles />
    <div key={currentScreen} className="page-transition min-h-screen bg-[#0a0a0c] text-white font-sans overflow-x-hidden relative">
      {/* Anime Theme Background Accents */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-red-800/10 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50 z-0"></div>
      </div>
      
      <div className="relative z-10 p-6 flex flex-col min-h-screen max-w-md mx-auto">
        {(title || showBack) && (
          <div className="flex items-center mb-8 pb-4 border-b border-red-900/50">
            {showBack && (
              <button onClick={onBack} className="p-2 -ml-2 text-red-500 hover:text-red-400 transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <h1 className="text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-red-500 uppercase flex-1 text-center pr-8">
              {title}
            </h1>
          </div>
        )}
        {children}
      </div>
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded border border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.7)] font-bold tracking-wider animate-bounce">
          {toastMessage}
        </div>
      )}
    </div>
  </>
);

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [user, setUser] = useState(null);
  const [authDetails, setAuthDetails] = useState({ name: '', email: '', phone: '', method: '' });
  const [onboardingData, setOnboardingData] = useState({ age: '', weight: '', height: '', gender: '', goalWeight: '' });
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [pendingWorkout, setPendingWorkout] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isVanishing, setIsVanishing] = useState(false);

  // Toast Notification System
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- SPLASH SCREEN & AUTH INIT ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const transitionToNextScreen = () => {
    if (isVanishing) return;
    setIsVanishing(true);

    try {
      const swoosh = new Audio('https://actions.google.com/sounds/v1/foley/whoosh_heavy.ogg');
      swoosh.volume = 1.0; 
      swoosh.play().catch(e => console.log("Autoplay blocked. User needs to tap the screen first."));
    } catch (error) {}

    setTimeout(() => {
      setCurrentScreen('auth'); 
      setIsVanishing(false);
    }, 600);
  };

  // Fetch Workout History from Backend
  useEffect(() => {
    if (!user) return;
    const historyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'history');
    const unsubscribe = onSnapshot(historyRef, (snapshot) => {
        const history = [];
        snapshot.forEach(document => history.push(document.data()));
        history.sort((a, b) => b.id - a.id);
        setWorkoutHistory(history);
    }, (error) => console.error("History sync error:", error));
    return () => unsubscribe();
  }, [user]);

  // --- 1. Splash Screen ---
  if (currentScreen === 'splash') {
    return (
      <div 
        className={`h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden bg-cover bg-center cursor-pointer transition-all duration-700 ease-in-out ${isVanishing ? 'opacity-0 scale-150 blur-xl' : 'opacity-100 scale-100 blur-0'}`}
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(10,10,12,0.8), rgba(220,38,38,0.6)), url('https://images.unsplash.com/photo-1599058917212-97d142cb4126?q=80&w=2000&auto=format&fit=crop')`,
          backgroundBlendMode: 'multiply'
        }}
        onClick={transitionToNextScreen}
      >
        <div className="absolute inset-0 z-0 opacity-40">
            <div className="w-full h-full bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,rgba(220,38,38,0.3)_50%,transparent_100%)] animate-spin" style={{ animationDuration: '8s' }}></div>
        </div>
        
        <div className={`z-10 text-center transition-transform duration-700 ${isVanishing ? 'scale-150' : 'animate-pulse scale-110'}`}>
          <Flame size={90} className="text-red-500 mx-auto mb-4 drop-shadow-[0_0_30px_rgba(220,38,38,1)]" />
          <h1 className="text-6xl font-black italic text-white tracking-widest uppercase drop-shadow-[0_5px_10px_rgba(0,0,0,0.9)]">
            Gym <span className="text-red-600">World</span>
          </h1>
          <p className={`mt-12 text-red-400 font-bold tracking-widest uppercase text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isVanishing ? 'opacity-0' : 'animate-bounce'}`}>
            Tap to Enter
          </p>
        </div>
      </div>
    );
  }

  // --- 2. Auth Screen ---
  if (currentScreen === 'auth') {
    return (
      <ScreenWrapper title="" showBack={false} currentScreen={currentScreen} toastMessage={toastMessage}>
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="mb-12 text-center">
             <Flame size={60} className="text-red-600 mx-auto mb-4" />
             <h2 className="text-3xl font-black italic uppercase tracking-wider">Awaken Your<br/><span className="text-red-600">Power</span></h2>
          </div>
          
          <div className="w-full space-y-4">
            <button 
              onClick={() => { setAuthDetails({...authDetails, method: 'email'}); setCurrentScreen('auth-form'); }}
              className="w-full flex items-center justify-center space-x-3 bg-white text-black py-4 rounded-sm font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors"
            >
              <Mail size={20} />
              <span>Continue with Gmail</span>
            </button>
            
            <button 
              onClick={() => { setAuthDetails({...authDetails, method: 'phone'}); setCurrentScreen('auth-form'); }}
              className="w-full flex items-center justify-center space-x-3 bg-red-600 text-white py-4 rounded-sm font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:bg-red-500 transition-colors"
            >
              <Smartphone size={20} />
              <span>Continue with Phone</span>
            </button>
          </div>
          
          <button 
            onClick={() => setCurrentScreen('dashboard')}
            className="mt-8 text-sm text-gray-400 hover:text-white underline italic"
          >
            Simulate Existing User Login
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  // --- 2.5 Auth Form Data Collection ---
  if (currentScreen === 'auth-form') {
    const isEmail = authDetails.method === 'email';
    
    const handleSaveAuth = async () => {
       if (!authDetails.name || (isEmail && !authDetails.email) || (!isEmail && !authDetails.phone)) {
          showToast("Please fill all required fields");
          return;
       }

       if (isEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(authDetails.email)) {
              showToast("Please enter a valid email format");
              return;
          }
       }
       
       if (user) {
          try {
             const infoRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
             await setDoc(infoRef, {
                name: authDetails.name,
                email: authDetails.email,
                phone: authDetails.phone,
                method: authDetails.method,
                updatedAt: new Date().toISOString()
             }, { merge: true });
             showToast("Profile linked securely!");
             setCurrentScreen('onboarding');
          } catch (error) {
             console.error("Save auth error:", error);
             showToast("Failed to save profile connection.");
          }
       } else {
          showToast("Initializing secure connection, please wait...");
       }
    };

    return (
       <ScreenWrapper title={isEmail ? "Email Verification" : "Phone Verification"} showBack={true} onBack={() => setCurrentScreen('auth')} currentScreen={currentScreen} toastMessage={toastMessage}>
          <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="bg-zinc-900/80 p-4 border-l-2 border-red-600">
                <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Fighter Name</label>
                <input type="text" placeholder="e.g. Baki Hanma" className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1" 
                  value={authDetails.name}
                  onChange={e => setAuthDetails({...authDetails, name: e.target.value})} />
             </div>

             {isEmail ? (
                <div className="bg-zinc-900/80 p-4 border-l-2 border-red-600">
                  <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Email Address</label>
                  <input type="email" placeholder="fighter@gymworld.com" className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1" 
                    value={authDetails.email}
                    onChange={e => setAuthDetails({...authDetails, email: e.target.value})} />
               </div>
             ) : (
                <div className="bg-zinc-900/80 p-4 border-l-2 border-red-600">
                  <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Phone Number</label>
                  <input type="tel" placeholder="+1 234 567 8900" className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1" 
                    value={authDetails.phone}
                    onChange={e => setAuthDetails({...authDetails, phone: e.target.value})} />
               </div>
             )}

             <button onClick={handleSaveAuth} className="w-full bg-red-600 text-white py-4 rounded-sm font-black italic uppercase tracking-widest mt-8 shadow-[0_0_20px_rgba(220,38,38,0.5)] flex justify-center items-center gap-2">
               Link Profile & Continue <ChevronRight size={20} />
             </button>
          </div>
       </ScreenWrapper>
    );
  }

  // --- 3. Onboarding ---
  if (currentScreen === 'onboarding') {
    const handleNext = async () => {
      if (!onboardingData.age || !onboardingData.weight || !onboardingData.height) {
        showToast("Fill required stats to proceed!");
        return;
      }
      
      if (user) {
        try {
          const statsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'stats');
          await setDoc(statsRef, onboardingData, { merge: true });
          showToast("Fighter stats synced to backend!");
        } catch (error) {
          console.error("Error saving stats:", error);
          showToast("Error syncing stats.");
        }
      }

      setCurrentScreen('goals');
    };

    return (
      <ScreenWrapper title="Fighter Stats" showBack={true} onBack={() => setCurrentScreen('auth')} currentScreen={currentScreen} toastMessage={toastMessage}>
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
               <div className="flex-1 bg-zinc-900/80 p-4 border-l-2 border-red-600">
                  <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Age</label>
                  <input type="number" placeholder="24" className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1" 
                    value={onboardingData.age}
                    onChange={e => setOnboardingData({...onboardingData, age: e.target.value})} />
               </div>
               <div className="flex-1 bg-zinc-900/80 p-4 border-l-2 border-red-600">
                  <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Gender</label>
                  <select className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1 appearance-none"
                    value={onboardingData.gender}
                    onChange={e => setOnboardingData({...onboardingData, gender: e.target.value})}>
                    <option value="" className="bg-zinc-900 text-gray-500">Select</option>
                    <option value="male" className="bg-zinc-900">Male</option>
                    <option value="female" className="bg-zinc-900">Female</option>
                  </select>
               </div>
            </div>
            
            <div className="flex gap-4">
               <div className="flex-1 bg-zinc-900/80 p-4 border-l-2 border-red-600">
                  <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Weight (kg)</label>
                  <input type="number" placeholder="75" className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1"
                    value={onboardingData.weight}
                    onChange={e => setOnboardingData({...onboardingData, weight: e.target.value})} />
               </div>
               <div className="flex-1 bg-zinc-900/80 p-4 border-l-2 border-red-600">
                  <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Height (cm)</label>
                  <input type="number" placeholder="180" className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1"
                    value={onboardingData.height}
                    onChange={e => setOnboardingData({...onboardingData, height: e.target.value})} />
               </div>
            </div>

            <div className="bg-zinc-900/80 p-4 border-l-2 border-red-600">
                <label className="text-xs text-red-500 uppercase font-bold tracking-wider">Target Weight (kg)</label>
                <input type="number" placeholder="80" className="w-full bg-transparent text-white text-xl font-bold focus:outline-none mt-1"
                  value={onboardingData.goalWeight}
                  onChange={e => setOnboardingData({...onboardingData, goalWeight: e.target.value})} />
            </div>
          </div>
          
          <button onClick={handleNext} className="w-full bg-red-600 text-white py-4 rounded-sm font-black italic uppercase tracking-widest mt-auto shadow-[0_0_20px_rgba(220,38,38,0.5)] flex justify-center items-center gap-2">
            Confirm Stats <ChevronRight size={20} />
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  // --- 4. Goals Selection ---
  if (currentScreen === 'goals') {
    const toggleGoal = (goal) => {
      if (selectedGoals.includes(goal)) {
        setSelectedGoals(selectedGoals.filter(g => g !== goal));
      } else {
        if (selectedGoals.length >= 2) {
          showToast("Max 2 goals allowed!");
          return;
        }
        setSelectedGoals([...selectedGoals, goal]);
      }
    };

    const handleNext = () => {
      if (selectedGoals.length === 0) {
        showToast("Select at least 1 goal");
        return;
      }
      if (selectedGoals.length === 2) {
        const isIncompatible = INCOMPATIBLE_GOALS.some(pair => 
          selectedGoals.includes(pair[0]) && selectedGoals.includes(pair[1])
        );
        if (isIncompatible) {
          showToast("Please select compatible goals");
          setSelectedGoals([]);
          return;
        }
      }
      setCurrentScreen('muscles');
    };

    return (
      <ScreenWrapper title="Select Path" showBack={true} onBack={() => setCurrentScreen('onboarding')} currentScreen={currentScreen} toastMessage={toastMessage}>
        <p className="text-gray-400 mb-6 text-sm italic">Choose your destiny (Select 1 or 2)</p>
        <div className="grid grid-cols-2 gap-3 flex-1 content-start">
          {GOALS.map(goal => {
            const isSelected = selectedGoals.includes(goal);
            return (
              <button 
                key={goal}
                onClick={() => toggleGoal(goal)}
                className={`p-4 text-left rounded-sm border transition-all ${
                  isSelected 
                    ? 'bg-red-600/20 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-red-500/50'
                }`}
              >
                <Target size={20} className={isSelected ? 'text-red-500 mb-2' : 'text-gray-600 mb-2'} />
                <span className={`font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{goal}</span>
              </button>
            );
          })}
        </div>
        <button onClick={handleNext} className="w-full bg-red-600 text-white py-4 mt-8 rounded-sm font-black italic uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)]">
          Next Phase
        </button>
      </ScreenWrapper>
    );
  }

  // --- 5. Muscle Selection ---
  if (currentScreen === 'muscles') {
    const toggleMuscle = (muscle) => {
      if (selectedMuscles.includes(muscle)) setSelectedMuscles(selectedMuscles.filter(m => m !== muscle));
      else setSelectedMuscles([...selectedMuscles, muscle]);
    };

    const handleNext = () => {
      if (selectedMuscles.length === 0) {
        showToast("Select at least 1 muscle group");
        return;
      }
      setCurrentScreen('recommendations');
    };

    return (
      <ScreenWrapper title="Target Area" showBack={true} onBack={() => setCurrentScreen('goals')} currentScreen={currentScreen} toastMessage={toastMessage}>
        <p className="text-gray-400 mb-6 text-sm italic">Select muscles to destroy</p>
        <div className="flex flex-wrap gap-3 flex-1 content-start">
          {MUSCLES.map(muscle => {
            const isSelected = selectedMuscles.includes(muscle);
            return (
              <button 
                key={muscle}
                onClick={() => toggleMuscle(muscle)}
                className={`px-5 py-3 rounded-sm border font-bold uppercase tracking-wider transition-all ${
                  isSelected 
                    ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' 
                    : 'bg-zinc-900 border-zinc-800 text-gray-400'
                }`}
              >
                {muscle}
              </button>
            );
          })}
        </div>
        <button onClick={handleNext} className="w-full bg-red-600 text-white py-4 mt-8 rounded-sm font-black italic uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)]">
          Generate Workout
        </button>
      </ScreenWrapper>
    );
  }

  // --- 6. Recommendations ---
  if (currentScreen === 'recommendations') {
    const isSingle = selectedMuscles.length === 1;
    let recs = [];
    
    if (isSingle) {
      recs = WORKOUT_DB[selectedMuscles[0]].slice(0, 10).map(name => ({ muscle: selectedMuscles[0], name }));
    } else {
      selectedMuscles.forEach(m => {
        WORKOUT_DB[m].slice(0, 3).forEach(name => recs.push({ muscle: m, name }));
      });
    }

    return (
      <ScreenWrapper title="Battle Plan" showBack={true} onBack={() => setCurrentScreen('muscles')} currentScreen={currentScreen} toastMessage={toastMessage}>
        <div className="mb-4 flex justify-between items-end border-b border-red-900/50 pb-2">
           <span className="text-gray-400 text-sm italic">{isSingle ? 'Top 10 Focused' : 'Top 3 Full Body Split'}</span>
           <span className="text-red-500 font-bold">{recs.length} Missions</span>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto pb-6 pr-2 custom-scrollbar">
          {recs.map((workout, idx) => (
            <div 
              key={idx} 
              onClick={() => { setCurrentWorkout(workout); setCurrentScreen('workoutDetail'); }}
              className="bg-zinc-900 p-4 border-l-4 border-red-600 flex justify-between items-center cursor-pointer hover:bg-zinc-800 transition-colors"
            >
              <div>
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest mb-1">{workout.muscle}</p>
                <p className="font-bold text-lg">{workout.name}</p>
              </div>
              <ChevronRight className="text-gray-600" />
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  // --- 7. Workout Detail & Animation ---
  if (currentScreen === 'workoutDetail') {
    return (
      <ScreenWrapper title={currentWorkout.name} showBack={true} onBack={() => setCurrentScreen('recommendations')} currentScreen={currentScreen} toastMessage={toastMessage}>
        
        {/* Animated AI Video Simulation */}
        <AnimatedDemo workout={currentWorkout} />

        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-900 p-4 text-center border-t-2 border-red-600">
                <p className="text-gray-400 text-xs uppercase mb-1">Recommended Weight</p>
                <p className="text-2xl font-black italic">
                  {onboardingData.gender === 'female' ? '10-15' : '15-20'} <span className="text-sm text-red-500">KG</span>
                </p>
            </div>
            <div className="bg-zinc-900 p-4 text-center border-t-2 border-red-600">
                <p className="text-gray-400 text-xs uppercase mb-1">Target Reps</p>
                <p className="text-2xl font-black italic">
                  3 <span className="text-sm text-red-500">x</span> 8-12
                </p>
            </div>
        </div>

        <button 
          onClick={() => setCurrentScreen('camera')}
          className="w-full bg-red-600 text-white py-5 rounded-sm font-black italic uppercase tracking-widest mt-auto shadow-[0_0_30px_rgba(220,38,38,0.4)] flex justify-center items-center gap-3 animate-pulse"
        >
          <Camera size={24} /> Enter AI Vision Mode
        </button>
      </ScreenWrapper>
    );
  }

  // --- 8. AI Camera Mode ---
  if (currentScreen === 'camera') {
    return <CameraEngine workout={currentWorkout} onComplete={(reps, mistakes) => {
        setPendingWorkout({
            id: Date.now(),
            name: currentWorkout.name,
            muscle: currentWorkout.muscle,
            reps: reps,
            date: new Date().toLocaleDateString()
        });
        setCurrentScreen('sessionComplete');
    }} onExit={() => setCurrentScreen('workoutDetail')} />;
  }

  // --- 9. Dashboard (Existing User) ---
  if (currentScreen === 'dashboard') {
    return (
      <ScreenWrapper title="Command Center" showBack={false} currentScreen={currentScreen} toastMessage={toastMessage}>
        <div className="flex gap-4 mb-8">
            <div className="flex-1 bg-zinc-900 p-4 rounded-sm border-l-4 border-red-600">
                <Flame className="text-red-500 mb-2" size={20} />
                <p className="text-2xl font-black">{workoutHistory.length}</p>
                <p className="text-xs text-gray-400 uppercase">Missions Done</p>
            </div>
            <div className="flex-1 bg-zinc-900 p-4 rounded-sm border-l-4 border-red-600">
                <Activity className="text-red-500 mb-2" size={20} />
                <p className="text-2xl font-black">Lvl {Math.floor(workoutHistory.length / 5) + 1}</p>
                <p className="text-xs text-gray-400 uppercase">Fighter Rank</p>
            </div>
        </div>

        <button 
          onClick={() => setCurrentScreen('goals')}
          className="w-full bg-red-600 text-white py-4 rounded-sm font-black italic uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] flex justify-center items-center gap-2 mb-8 hover:bg-red-500 transition-colors"
        >
          <Play size={20} fill="currentColor" /> Start New Mission
        </button>

        <h3 className="font-bold uppercase tracking-wider text-red-500 mb-4 flex items-center gap-2">
            <History size={18} /> Battle History
        </h3>
        
        <div className="space-y-3 overflow-y-auto flex-1 pb-6 custom-scrollbar">
            {workoutHistory.length === 0 ? (
                <div className="text-center p-8 bg-zinc-900/50 border border-zinc-800 border-dashed text-gray-500 italic">
                    No battles fought yet. Enter the arena.
                </div>
            ) : (
                workoutHistory.map(session => (
                    <div key={session.id} className="bg-zinc-900 p-4 border border-zinc-800 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-lg">{session.name}</p>
                            <p className="text-xs text-gray-400">{session.muscle} | {session.date}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-red-500 font-bold">{session.reps} Reps</span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </ScreenWrapper>
    );
  }

  // --- 10. Session Completion ---
  if (currentScreen === 'sessionComplete') {
    return (
      <ScreenWrapper title="Mission Accomplished" showBack={false} currentScreen={currentScreen} toastMessage={toastMessage}>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-40 rounded-full"></div>
                <CheckCircle size={100} className="text-red-500 relative z-10" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-wider mb-2">Workout Complete</h2>
            <p className="text-gray-400 mb-8">+100 Power XP Earned</p>

            <div className="w-full space-y-4 mt-8">
                <button 
                  onClick={async () => {
                      if (user && pendingWorkout) {
                          try {
                              const historyRef = doc(db, 'artifacts', appId, 'users', user.uid, 'history', pendingWorkout.id.toString());
                              await setDoc(historyRef, pendingWorkout);
                              showToast("Data Synced to Core Database.");
                          } catch (error) {
                              console.error("Error saving workout:", error);
                              showToast("Sync Failed.");
                          }
                      }
                      setCurrentScreen('dashboard');
                  }}
                  className="w-full flex justify-center items-center gap-2 bg-red-600 text-white py-4 rounded-sm font-black italic uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                  <Save size={20} /> Save Progress & Sync
                </button>
                <button 
                  onClick={() => setCurrentScreen('dashboard')}
                  className="w-full flex justify-center items-center gap-2 bg-zinc-900 text-gray-300 py-4 rounded-sm font-bold uppercase tracking-wider hover:bg-zinc-800"
                >
                  <LogOut size={20} /> Exit to Command Center
                </button>
            </div>
        </div>
      </ScreenWrapper>
    );
  }

  return null;
}

// --- SUB-COMPONENTS ---

// Animated Workout Demo Player (Simulates unique workouts by specific exercise name)
function AnimatedDemo({ workout }) {
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState(0); // 0: Grip, 1: Front View, 2: Side View
    const [isPlaying, setIsPlaying] = useState(true);
    const [timeElapsed, setTimeElapsed] = useState(0);

    const name = workout.name.toLowerCase();
    const muscle = workout.muscle;

    useEffect(() => {
        if (!isPlaying) return;
        
        let startTime = Date.now();
        const duration = 8000; 

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const currentProgress = Math.min((elapsed / duration) * 100, 100);
            
            setProgress(currentProgress);
            setTimeElapsed(elapsed);

            if (currentProgress < 25) setPhase(0); 
            else if (currentProgress < 62.5) setPhase(1); 
            else setPhase(2); 

            if (currentProgress < 100) {
                requestAnimationFrame(animate);
            } else {
                setIsPlaying(false);
            }
        };
        
        const frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying]);

    const handleReplay = () => {
        setProgress(0);
        setPhase(0);
        setIsPlaying(true);
        setTimeElapsed(0);
    };

    // Dynamic Geometry Engine for EVERY specific exercise
    const getSkeleton = (view, rep) => {
        let s = {
            head: {x: 50, y: 20}, torso: {start: {x: 50, y: 26}, end: {x: 50, y: 55}},
            lShoulder: {x: 38, y: 26}, rShoulder: {x: 62, y: 26},
            lElbow: {x: 33, y: 40}, rElbow: {x: 67, y: 40},
            lHand: {x: 30, y: 55}, rHand: {x: 70, y: 55},
            lHip: {x: 44, y: 55}, rHip: {x: 56, y: 55},
            lKnee: {x: 44, y: 75}, rKnee: {x: 56, y: 75},
            lFoot: {x: 44, y: 95}, rFoot: {x: 56, y: 95},
            bench: null, equipment: 'dumbbells', customDraw: null
        };

        if (view === 'side') {
           s.lShoulder.x = s.rShoulder.x = 50; s.lHip.x = s.rHip.x = 50;
           s.lKnee.x = s.rKnee.x = 55; s.lFoot.x = s.rFoot.x = 55;
        }

        // --- SPECIFIC EXERCISE KINEMATICS ---
        
        // --- 1. CHEST WORKOUTS ---
        if (name.includes('incline bench')) {
            s.equipment = 'barbell';
            if (view === 'front') {
                s.bench = { type: 'rect', x: 40, y: 15, w: 20, h: 70 }; 
                s.head.y = 25; s.torso.start.y = 31;
                s.lElbow = {x: 25 + rep*10, y: 40}; s.rElbow = {x: 75 - rep*10, y: 40};
                s.lHand = {x: 35, y: 35}; s.rHand = {x: 65, y: 35};
            } else {
                s.bench = { type: 'line', x1: 20, y1: 75, x2: 65, y2: 40 }; 
                s.head = {x: 60, y: 40};
                s.torso.start = {x: 55, y: 48}; s.torso.end = {x: 30, y: 68};
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 20, y: 75}; s.rFoot = {x: 25, y: 95};
                s.rElbow = {x: 50, y: 65 - rep*10}; 
                s.rHand = {x: 50, y: 55 - rep*35}; 
            }
        } 
        else if (name.includes('decline press')) {
            s.equipment = 'barbell';
            if (view === 'front') {
                s.bench = { type: 'rect', x: 35, y: 10, w: 30, h: 80 };
                s.lElbow = {x: 25 + rep*10, y: 30}; s.rElbow = {x: 75 - rep*10, y: 30};
                s.lHand = {x: 35, y: 40}; s.rHand = {x: 65, y: 40}; 
            } else {
                s.bench = { type: 'line', x1: 20, y1: 50, x2: 80, y2: 70 }; 
                s.head = {x: 30, y: 70};
                s.torso.start = {x: 35, y: 65}; s.torso.end = {x: 65, y: 55};
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 75, y: 50}; s.rFoot = {x: 70, y: 75};
                s.rElbow = {x: 45, y: 80 - rep*15}; 
                s.rHand = {x: 40, y: 60 - rep*35}; 
            }
        }
        else if (name.includes('flat bench') || (name.includes('press') && muscle === 'Chest')) {
            s.equipment = 'barbell';
            if (view === 'front') {
                s.bench = { type: 'rect', x: 35, y: 10, w: 30, h: 80 }; 
                s.lElbow = {x: 25 + rep*10, y: 35}; s.rElbow = {x: 75 - rep*10, y: 35};
                s.lHand = {x: 35, y: 35}; s.rHand = {x: 65, y: 35};
            } else {
                s.bench = { type: 'line', x1: 20, y1: 65, x2: 80, y2: 65 }; 
                s.head = {x: 25, y: 60};
                s.torso.start = {x: 35, y: 62}; s.torso.end = {x: 60, y: 62};
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 70, y: 75}; s.rFoot = {x: 70, y: 95};
                s.rElbow = {x: 35, y: 75 - rep*10}; 
                s.rHand = {x: 35, y: 60 - rep*35};
            }
        }
        else if (name.includes('fly') || name.includes('pec deck')) {
            s.equipment = 'cables'; 
            if (view === 'front') {
                s.lElbow = {x: 15 + rep*30, y: 35}; s.rElbow = {x: 85 - rep*30, y: 35};
                s.lHand = {x: 10 + rep*38, y: 35}; s.rHand = {x: 90 - rep*38, y: 35};
            } else {
                s.rElbow = {x: 40 + rep*10, y: 35};
                s.rHand = {x: 30 + rep*20, y: 35};
            }
        }
        else if (name.includes('push up')) {
            s.equipment = 'none';
            if (view === 'front') {
                s.lElbow = {x: 25 + rep*10, y: 40}; s.rElbow = {x: 75 - rep*10, y: 40};
                s.lHand = {x: 30, y: 25}; s.rHand = {x: 70, y: 25}; 
            } else {
                s.head = {x: 20, y: 75 + rep*15};
                s.torso.start = {x: 30, y: 80 + rep*12}; s.torso.end = {x: 60, y: 88 + rep*3};
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 75, y: 92 + rep*1}; s.rFoot = {x: 90, y: 95};
                s.rElbow = {x: 35 + rep*5, y: 85 + rep*5}; 
                s.rHand = {x: 30, y: 95}; 
            }
        }

        // --- 2. BACK WORKOUTS ---
        else if (name.includes('pull up')) {
            s.equipment = 'barbell'; 
            if (view === 'front') {
                s.head.y = 30 - rep*15; s.torso.start.y = 36 - rep*15; s.torso.end.y = 65 - rep*15;
                s.lShoulder.y = 36 - rep*15; s.rShoulder.y = 36 - rep*15;
                s.lHip.y = 65 - rep*15; s.rHip.y = 65 - rep*15;
                s.lKnee.y = 85 - rep*15; s.rKnee.y = 85 - rep*15;
                s.lFoot.y = 95 - rep*15; s.rFoot.y = 95 - rep*15;
                s.lElbow = {x: 25, y: 20 + rep*10}; s.rElbow = {x: 75, y: 20 + rep*10};
                s.lHand = {x: 30, y: 10}; s.rHand = {x: 70, y: 10}; 
            } else {
                s.head.y = 30 - rep*15; s.torso.start.y = 36 - rep*15; s.torso.end.y = 65 - rep*15;
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 55, y: 85 - rep*15}; s.rFoot = {x: 55, y: 95 - rep*15};
                s.rElbow = {x: 60, y: 25 + rep*5}; s.rHand = {x: 50, y: 10};
            }
        }
        else if (name.includes('pulldown')) {
            s.equipment = 'barbell'; 
            if (view === 'front') {
                s.bench = { type: 'rect', x: 40, y: 55, w: 20, h: 40 }; 
                s.lElbow = {x: 25, y: 15 + rep*30}; s.rElbow = {x: 75, y: 15 + rep*30};
                s.lHand = {x: 30, y: 10 + rep*30}; s.rHand = {x: 70, y: 10 + rep*30}; 
            } else {
                s.bench = { type: 'rect', x: 45, y: 60, w: 15, h: 35 }; 
                s.rElbow = {x: 60, y: 15 + rep*30}; s.rHand = {x: 50, y: 10 + rep*30};
            }
        }
        else if (name.includes('deadlift') || name.includes('good morning')) {
            s.equipment = 'barbell';
            if (view === 'front') {
                let drop = (1-rep)*25;
                s.head.y = 20 + drop; s.torso.start.y = 26 + drop; s.torso.end.y = 55 + drop/2;
                s.lShoulder.y = 26 + drop; s.rShoulder.y = 26 + drop;
                s.lHand = {x: 40, y: 55 + drop*1.5}; s.rHand = {x: 60, y: 55 + drop*1.5};
                s.lElbow = {x: 39, y: 40 + drop*1.2}; s.rElbow = {x: 61, y: 40 + drop*1.2};
            } else {
                let drop = (1-rep)*30;
                s.head = {x: 50 + drop*0.5, y: 20 + drop};
                s.torso.start = {x: 50 + drop*0.5, y: 26 + drop}; 
                s.torso.end = {x: 50 - drop*0.5, y: 55 + drop/3}; 
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 55, y: 75}; s.rFoot = {x: 55, y: 95};
                s.rElbow = {x: 50 + drop*0.2, y: 45 + drop*1.2}; 
                s.rHand = {x: 50, y: 55 + drop*1.3}; 
            }
        }
        else if (name.includes('row')) {
            s.equipment = 'barbell';
            if (view === 'front') {
                s.head.y = 40; s.torso.start.y = 45; s.torso.end.y = 65;
                s.lShoulder.y = 45; s.rShoulder.y = 45;
                s.lElbow = {x: 35 + rep*5, y: 60 - rep*10}; s.rElbow = {x: 65 - rep*5, y: 60 - rep*10};
                s.lHand = {x: 40, y: 75 - rep*25}; s.rHand = {x: 60, y: 75 - rep*25};
            } else {
                s.head = {x: 30, y: 35};
                s.torso.start = {x: 35, y: 40}; s.torso.end = {x: 55, y: 55}; 
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 60, y: 75}; s.rFoot = {x: 55, y: 95};
                s.rElbow = {x: 45 - rep*15, y: 60 - rep*15}; 
                s.rHand = {x: 40 + rep*5, y: 75 - rep*30}; 
            }
        }

        // --- 3. BICEPS WORKOUTS ---
        else if (name.includes('preacher curl')) {
            s.equipment = 'barbell';
            if (view === 'front') {
                s.bench = { type: 'rect', x: 30, y: 45, w: 40, h: 55 }; 
                s.lElbow = {x: 40, y: 45}; s.rElbow = {x: 60, y: 45}; 
                s.lHand = {x: 40, y: 55 - rep*25}; s.rHand = {x: 60, y: 55 - rep*25};
            } else {
                s.bench = { type: 'line', x1: 45, y1: 55, x2: 65, y2: 35 }; 
                s.rElbow = {x: 55, y: 45};
                s.rHand = {x: 65 - rep*20, y: 55 - rep*35}; 
            }
        }
        else if (muscle === 'Biceps') { 
            s.equipment = name.includes('barbell') ? 'barbell' : 'dumbbells';
            if (view === 'front') {
                s.lElbow = {x: 35, y: 45}; s.rElbow = {x: 65, y: 45}; 
                s.lHand = {x: 30, y: 55 - rep*25}; s.rHand = {x: 70, y: 55 - rep*25};
            } else {
                s.rElbow = {x: 50, y: 45};
                s.rHand = {x: 50 + rep*15, y: 55 - rep*25}; 
            }
        }

        // --- 4. TRICEPS WORKOUTS ---
        else if (name.includes('skullcrusher') || name.includes('overhead extension')) {
            s.equipment = 'barbell';
            if (view === 'front') {
                s.bench = { type: 'rect', x: 35, y: 10, w: 30, h: 80 }; 
                s.lElbow = {x: 40, y: 30}; s.rElbow = {x: 60, y: 30}; 
                s.lHand = {x: 40, y: 20 + rep*15}; s.rHand = {x: 60, y: 20 + rep*15}; 
            } else {
                s.bench = { type: 'line', x1: 20, y1: 65, x2: 80, y2: 65 }; 
                s.head = {x: 25, y: 60};
                s.torso.start = {x: 35, y: 62}; s.torso.end = {x: 60, y: 62};
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 70, y: 75}; s.rFoot = {x: 70, y: 95};
                s.rElbow = {x: 25, y: 40}; 
                s.rHand = {x: 15 + rep*15, y: 50 - rep*30}; 
            }
        }
        else if (name.includes('dip')) {
            s.equipment = 'none'; 
            if (view === 'front') {
                s.bench = { type: 'line', x1: 20, y1: 50, x2: 30, y2: 50 }; 
                s.head.y = 20 + rep*15; s.torso.start.y = 26 + rep*15; s.torso.end.y = 55 + rep*15;
                s.lShoulder.y = 26 + rep*15; s.rShoulder.y = 26 + rep*15;
                s.lHand = {x: 35, y: 50}; s.rHand = {x: 65, y: 50}; 
                s.lElbow = {x: 25, y: 40 + rep*10}; s.rElbow = {x: 75, y: 40 + rep*10}; 
            } else {
                s.head.y = 20 + rep*15; s.torso.start.y = 26 + rep*15; s.torso.end.y = 55 + rep*15;
                s.rShoulder = s.torso.start;
                s.rHand = {x: 50, y: 50}; 
                s.rElbow = {x: 40, y: 40 + rep*10}; 
            }
        }
        else if (name.includes('pushdown') || muscle === 'Triceps') {
            s.equipment = 'cables';
            if (view === 'front') {
                s.lElbow = {x: 40, y: 40}; s.rElbow = {x: 60, y: 40}; 
                s.lHand = {x: 45, y: 35 + rep*20}; s.rHand = {x: 55, y: 35 + rep*20}; 
            } else {
                s.rElbow = {x: 50, y: 40};
                s.rHand = {x: 55, y: 35 + rep*20}; 
            }
        }

        // --- 5. SHOULDERS WORKOUTS ---
        else if (name.includes('raise') && name.includes('lateral')) {
            s.equipment = 'dumbbells';
            if (view === 'front') {
                s.lElbow = {x: 33 - rep*20, y: 40 - rep*15}; s.rElbow = {x: 67 + rep*20, y: 40 - rep*15};
                s.lHand = {x: 30 - rep*20, y: 55 - rep*30}; s.rHand = {x: 70 + rep*20, y: 55 - rep*30}; 
            } else {
                s.rElbow = {x: 50, y: 40}; s.rHand = {x: 50, y: 55}; 
            }
        }
        else if (name.includes('raise') && name.includes('front')) {
            s.equipment = 'dumbbells';
            if (view === 'front') {
                s.lElbow = {x: 38, y: 40 - rep*15}; s.rElbow = {x: 62, y: 40 - rep*15};
                s.lHand = {x: 45, y: 55 - rep*30}; s.rHand = {x: 55, y: 55 - rep*30}; 
            } else {
                s.rElbow = {x: 50 + rep*15, y: 40 - rep*10};
                s.rHand = {x: 50 + rep*35, y: 55 - rep*25}; 
            }
        }
        else if (name.includes('press') && muscle === 'Shoulders') {
            s.equipment = 'dumbbells';
            if (view === 'front') {
                s.lElbow = {x: 25 + rep*5, y: 35 - rep*15}; s.rElbow = {x: 75 - rep*5, y: 35 - rep*15};
                s.lHand = {x: 25 + rep*15, y: 25 - rep*20}; s.rHand = {x: 75 - rep*15, y: 25 - rep*20}; 
            } else {
                s.rElbow = {x: 50, y: 35 - rep*15};
                s.rHand = {x: 50, y: 25 - rep*20};
            }
        }

        // --- 6. LEGS WORKOUTS ---
        else if (name.includes('squat')) {
            s.equipment = 'barbell';
            let drop = rep * 20;
            if (view === 'front') {
                s.head.y += drop; s.torso.start.y += drop; s.torso.end.y += drop;
                s.lShoulder.y += drop; s.rShoulder.y += drop; s.lHip.y += drop; s.rHip.y += drop;
                s.lKnee = {x: 35 - rep*5, y: 75 + drop/2}; s.rKnee = {x: 65 + rep*5, y: 75 + drop/2};
                s.lHand = {x: 30, y: 26 + drop}; s.rHand = {x: 70, y: 26 + drop};
                s.lElbow = {x: 25, y: 35 + drop}; s.rElbow = {x: 75, y: 35 + drop};
            } else {
                s.head.y += drop; s.torso.start.y += drop;
                s.torso.end = {x: 40, y: 55 + drop}; s.rHip = s.torso.end; 
                s.rKnee = {x: 65, y: 75 + drop/2};
                s.rShoulder.y += drop;
                s.rHand = {x: 50, y: 26 + drop}; s.rElbow = {x: 45, y: 35 + drop}; 
            }
        }
        else if (name.includes('leg press')) {
            s.equipment = 'barbell'; 
            if (view === 'front') {
                s.bench = { type: 'rect', x: 35, y: 50, w: 30, h: 45 }; 
                s.lKnee = {x: 35, y: 75 - rep*20}; s.rKnee = {x: 65, y: 75 - rep*20};
                s.lFoot = {x: 40, y: 85 - rep*40}; s.rFoot = {x: 60, y: 85 - rep*40}; 
            } else {
                s.bench = { type: 'line', x1: 20, y1: 85, x2: 50, y2: 40 }; 
                s.head = {x: 40, y: 50};
                s.torso.start = {x: 35, y: 60}; s.torso.end = {x: 25, y: 80}; 
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 45 - rep*10, y: 70 - rep*10}; 
                s.rFoot = {x: 55 + rep*20, y: 50 - rep*20}; 
            }
        }
        else if (name.includes('lunge') || name.includes('split squat')) {
            s.equipment = 'dumbbells';
            let drop = rep * 15;
            if (view === 'front') {
                s.head.y += drop; s.torso.start.y += drop; s.torso.end.y += drop;
                s.lShoulder.y += drop; s.rShoulder.y += drop; s.lHip.y += drop; s.rHip.y += drop;
                s.lElbow.y += drop; s.rElbow.y += drop; s.lHand.y += drop; s.rHand.y += drop;
            } else {
                s.head.y += drop; s.torso.start.y += drop; s.torso.end.y += drop;
                s.rShoulder.y += drop; s.rHip.y += drop;
                s.rElbow.y += drop; s.rHand.y += drop;
                s.lKnee = {x: 40, y: 75 + drop}; s.lFoot = {x: 40, y: 95}; 
                s.rKnee = {x: 70 + drop*0.5, y: 75}; s.rFoot = {x: 75, y: 95}; 
                s.customDraw = (
                    <path d={`M ${s.rHip.x} ${s.rHip.y} L ${s.lKnee.x} ${s.lKnee.y} L ${s.lFoot.x} ${s.lFoot.y}`} stroke="#b91c1c" strokeWidth="2.5" fill="none" strokeDasharray="4 2"/>
                );
            }
        }
        else if (muscle === 'Legs') { 
            s.equipment = 'none';
            if (view === 'front') {
                s.bench = { type: 'rect', x: 35, y: 50, w: 30, h: 45 }; 
                s.lFoot = {x: 40, y: 95 - rep*30}; s.rFoot = {x: 60, y: 95 - rep*30}; 
            } else {
                s.bench = { type: 'line', x1: 20, y1: 50, x2: 60, y2: 50 }; 
                s.head = {x: 30, y: 20}; s.torso.start = {x: 30, y: 26}; s.torso.end = {x: 30, y: 50};
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 60, y: 50}; 
                s.rFoot = {x: 60 + Math.sin(rep*Math.PI/2)*30, y: 80 - Math.cos(rep*Math.PI/2)*30}; 
            }
        }
        
        // --- 7. ABS WORKOUTS ---
        else if (name.includes('plank')) {
            s.equipment = 'none';
            if (view === 'front') {
                s.head.y = 80; s.torso.start.y = 80; s.torso.end.y = 80;
                s.lElbow = {x: 40, y: 95}; s.rElbow = {x: 60, y: 95};
                s.lHand = {x: 45, y: 95}; s.rHand = {x: 55, y: 95};
            } else {
                s.head = {x: 25, y: 85};
                s.torso.start = {x: 30, y: 85}; s.torso.end = {x: 55, y: 85}; 
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 70, y: 85}; s.rFoot = {x: 85, y: 95}; 
                s.rElbow = {x: 30, y: 95}; s.rHand = {x: 40, y: 95}; 
                let shake = Math.random() * 0.5;
                s.torso.start.y += shake; s.torso.end.y += shake;
            }
        }
        else if (name.includes('leg raise')) {
            s.equipment = 'none';
            if (view === 'front') {
                s.bench = { type: 'rect', x: 30, y: 20, w: 40, h: 70 }; 
                s.lFoot = {x: 45, y: 95 - rep*40}; s.rFoot = {x: 55, y: 95 - rep*40}; 
            } else {
                s.bench = { type: 'line', x1: 10, y1: 95, x2: 90, y2: 95 }; 
                s.head = {x: 20, y: 92}; 
                s.torso.start = {x: 30, y: 92}; s.torso.end = {x: 55, y: 92}; 
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rHand = {x: 35, y: 95}; s.rElbow = {x: 45, y: 95}; 
                s.rKnee = {x: 55 + 15*Math.cos(rep*Math.PI/2), y: 92 - 15*Math.sin(rep*Math.PI/2)}; 
                s.rFoot = {x: 55 + 35*Math.cos(rep*Math.PI/2), y: 92 - 35*Math.sin(rep*Math.PI/2)};
            }
        }
        else if (muscle === 'Abs') { 
            if (view === 'front') {
                s.bench = { type: 'rect', x: 30, y: 20, w: 40, h: 70 }; 
                s.head.y -= rep*5;
                s.lHand = {x: 45, y: 20}; s.rHand = {x: 55, y: 20};
            } else {
                s.bench = { type: 'line', x1: 10, y1: 95, x2: 90, y2: 95 }; 
                s.head = {x: 20 + rep*15, y: 90 - rep*20}; 
                s.torso.start = {x: 30 + rep*10, y: 92 - rep*10}; s.torso.end = {x: 55, y: 92};
                s.rShoulder = s.torso.start; s.rHip = s.torso.end;
                s.rKnee = {x: 70, y: 75}; s.rFoot = {x: 85, y: 95}; 
                s.rHand = {x: 25 + rep*15, y: 85 - rep*20}; s.rElbow = {x: 35 + rep*10, y: 80 - rep*15}; 
            }
        }

        return s;
    };

    const getInstructions = () => {
        if (name.includes('incline bench')) return { 
            grip: 'Wrap thumbs securely. Adjust bench to 30-45 degrees.', 
            front: 'Lower the bar to the upper chest. Keep forearms vertical.', 
            side: 'Press upward and slightly back over your collarbone.' 
        };
        if (name.includes('decline press')) return { 
            grip: 'Lock feet tightly into the bench pads.', 
            front: 'Bring the bar down to the lower chest level evenly.', 
            side: 'Press straight up vertically, avoiding pushing towards feet.' 
        };
        if (name.includes('flat bench') || name.includes('spoto')) return { 
            grip: 'Standard barbell grip. Retract scapula into the bench.', 
            front: 'Lower bar to mid-chest. Do not flare elbows out fully.', 
            side: 'Maintain a slight arch in the lower back. Keep glutes planted.' 
        };
        if (name.includes('fly') || name.includes('pec deck')) return { 
            grip: 'Grip handles firmly. Maintain a slight bend in the elbows.', 
            front: 'Bring hands together in a wide arc, squeezing the chest at peak.', 
            side: 'Keep chest up and avoid pushing shoulders forward during the sweep.' 
        };
        if (name.includes('push up')) return { 
            grip: 'Place hands flat on the floor, slightly wider than shoulder-width.', 
            front: 'Keep elbows tucked at a 45-degree angle from your torso.', 
            side: 'Maintain a perfectly straight line from your head to your heels.' 
        };
        if (name.includes('pull up')) return { 
            grip: 'Use a wide overhand grip on the bar.', 
            front: 'Pull your elbows down and back, lifting your chest to the bar.', 
            side: 'Keep your torso slightly angled back, avoiding swinging.' 
        };
        if (name.includes('pulldown')) return { 
            grip: 'Grip the wide bar slightly outside shoulder width.', 
            front: 'Pull the bar down to your upper chest, squeezing the lats.', 
            side: 'Lean back slightly and keep your torso rigid.' 
        };
        if (name.includes('deadlift')) return { 
            grip: 'Double overhand or mixed grip on the barbell.', 
            front: 'Keep your chest tall and core braced throughout the movement.', 
            side: 'Hinge at the hips. Keep the bar path completely vertical and close to legs.' 
        };
        if (name.includes('row')) return { 
            grip: 'Grip the bar slightly wider than shoulder-width.', 
            front: 'Pull the weight toward your belly button, keeping elbows tight.', 
            side: 'Keep your back straight, almost parallel to the floor.' 
        };
        if (name.includes('preacher')) return {
            grip: 'Grab the EZ bar. Rest triceps flat against the pad.',
            front: 'Curl the weight up evenly without lifting elbows off the pad.',
            side: 'Do not hyperextend the elbow at the bottom of the movement.'
        };
        if (name.includes('curl')) return { 
            grip: 'Underhand grip, wrists straight and locked.', 
            front: 'Keep elbows pinned to your sides. Squeeze biceps at the top.', 
            side: 'Do not use momentum from your back to swing the weight up.' 
        };
        if (name.includes('skullcrusher')) return {
            grip: 'Narrow grip on the EZ curl bar.',
            front: 'Keep elbows tucked in, pointing straight up towards the ceiling.',
            side: 'Lower the bar towards your forehead, extending only at the elbows.'
        };
        if (name.includes('dip')) return {
            grip: 'Grip the parallel bars firmly.',
            front: 'Lower yourself until your shoulders are below your elbows.',
            side: 'Lean forward slightly to target chest, or stay upright for triceps.'
        };
        if (name.includes('pushdown')) return {
            grip: 'Grip the cable attachment firmly at chest height.',
            front: 'Keep elbows locked at your sides. Push straight down.',
            side: 'Do not let the cable pull your elbows forward on the way up.'
        };
        if (name.includes('lateral raise')) return {
            grip: 'Hold dumbbells with a neutral grip by your sides.',
            front: 'Raise arms out to the side until parallel with the floor.',
            side: 'Keep a slight bend in the elbow and avoid swinging the torso.'
        };
        if (name.includes('press') && muscle === 'Shoulders') return {
            grip: 'Grip dumbbells at shoulder height, palms facing forward.',
            front: 'Press the weight overhead until arms are fully extended.',
            side: 'Do not lean back excessively; keep the core tight.'
        };
        if (name.includes('squat')) return { 
            grip: 'Secure the bar on your upper back/traps, not your neck.', 
            front: 'Push knees outward, tracking over your toes. Do not let them cave in.', 
            side: 'Hinge hips back and drop down until thighs are parallel to the floor.' 
        };
        if (name.includes('leg press')) return {
            grip: 'Sit deeply into the machine pad. Grip side handles.',
            front: 'Ensure knees track straight and don\'t buckle inward.',
            side: 'Lower the sled until your knees are at a 90-degree angle. Do not lock knees out.'
        };
        if (name.includes('lunge')) return {
            grip: 'Hold dumbbells securely by your sides.',
            front: 'Keep your chest up and ensure the front knee does not collapse inward.',
            side: 'Drop the back knee straight down toward the floor.'
        };
        if (name.includes('plank')) return {
            grip: 'Forearms flat on the floor, elbows directly under shoulders.',
            front: 'Keep shoulders completely level and stable.',
            side: 'Brace your core tightly. Hips should not sag or pike up.'
        };
        if (name.includes('leg raise')) return {
            grip: 'Hold onto a bench behind your head for stability.',
            front: 'Keep legs straight and pressed together tightly.',
            side: 'Press lower back into the floor. Raise legs to 90 degrees.'
        };
        
        return {
            grip: 'Establish a firm, comfortable grip on the equipment.',
            front: `Ensure symmetrical movement activating the ${muscle}.`,
            side: 'Maintain a neutral spine and control the weight throughout the entire rep.'
        };
    };

    const instructions = getInstructions();

    const renderVisuals = () => {
        if (phase === 0) {
            return (
                <svg viewBox="0 0 100 100" className="w-full h-full max-w-xs mx-auto absolute inset-0 transition-opacity duration-500">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="blur"/>
                            <feMerge>
                                <feMergeNode in="blur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <g filter="url(#glow)">
                        <line x1="20" y1="50" x2="80" y2="50" stroke="#444" strokeWidth={name.includes('push up') || name.includes('plank') ? 0 : 12} strokeLinecap="round" />
                        
                        <path d="M 45 60 Q 50 40 60 55" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
                        <path d="M 35 65 Q 50 35 65 65" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                        <path d="M 30 55 Q 50 25 70 55" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
                        
                        <circle cx="50" cy="50" r="35" strokeDasharray="10 10" stroke="#ef4444" strokeWidth="1" fill="none" className="animate-[spin_6s_linear_infinite] opacity-50" />
                        <text x="50" y="90" fill="#ef4444" fontSize="8" stroke="none" textAnchor="middle" className="font-mono tracking-widest animate-pulse">
                            {name.includes('plank') || name.includes('push up') ? 'HAND PLACEMENT' : 'LOCK GRIP'}
                        </text>
                    </g>
                </svg>
            );
        }

        const phaseStartTime = phase === 1 ? 2000 : 5000;
        const t = (timeElapsed - phaseStartTime) / 750; 
        const rep = (Math.sin(t * Math.PI - Math.PI/2) + 1) / 2;
        const view = phase === 1 ? 'front' : 'side';
        
        const s = getSkeleton(view, rep);

        return (
            <svg viewBox="0 0 100 100" className="w-full h-full max-w-xs mx-auto absolute inset-0 transition-opacity duration-500">
                 <defs>
                    <filter id="glow2">
                        <feGaussianBlur stdDeviation="1.5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <g filter="url(#glow2)">
                    <line x1="5" y1="95" x2="95" y2="95" stroke="#333" strokeWidth="2" />
                    
                    {s.bench && s.bench.type === 'rect' && (
                        <rect x={s.bench.x} y={s.bench.y} width={s.bench.w} height={s.bench.h} fill="#222" stroke="#444" strokeWidth="2" />
                    )}
                    {s.bench && s.bench.type === 'line' && (
                        <line x1={s.bench.x1} y1={s.bench.y1} x2={s.bench.x2} y2={s.bench.y2} stroke="#444" strokeWidth="6" strokeLinecap="round" />
                    )}

                    {s.equipment === 'cables' && (
                        <>
                            <line x1="0" y1="10" x2={s.lHand ? s.lHand.x : 0} y2={s.lHand ? s.lHand.y : 0} stroke="#555" strokeWidth="1" />
                            <line x1="100" y1="10" x2={s.rHand.x} y2={s.rHand.y} stroke="#555" strokeWidth="1" />
                        </>
                    )}

                    <g stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <circle cx={s.head.x} cy={s.head.y} r="5" fill="#000" />
                        <line x1={s.torso.start.x} y1={s.torso.start.y} x2={s.torso.end.x} y2={s.torso.end.y} />
                        
                        {s.customDraw}

                        <path d={`M ${s.rShoulder.x} ${s.rShoulder.y} L ${s.rElbow.x} ${s.rElbow.y} L ${s.rHand.x} ${s.rHand.y}`} stroke="#ff6b6b" />
                        <path d={`M ${s.rHip.x} ${s.rHip.y} L ${s.rKnee.x} ${s.rKnee.y} L ${s.rFoot.x} ${s.rFoot.y}`} strokeWidth="3.5" />

                        {view === 'front' && (
                            <>
                                <path d={`M ${s.lShoulder.x} ${s.lShoulder.y} L ${s.lElbow.x} ${s.lElbow.y} L ${s.lHand.x} ${s.lHand.y}`} stroke="#ff6b6b" />
                                <path d={`M ${s.lHip.x} ${s.lHip.y} L ${s.lKnee.x} ${s.lKnee.y} L ${s.lFoot.x} ${s.lFoot.y}`} strokeWidth="3.5" />
                            </>
                        )}
                    </g>
                    
                    <g stroke="#fff" strokeWidth="4" strokeLinecap="round">
                        {s.equipment === 'barbell' && view === 'front' && s.lHand && (
                            <line x1={s.lHand.x - 15} y1={s.lHand.y} x2={s.rHand.x + 15} y2={s.rHand.y} />
                        )}
                        {s.equipment === 'barbell' && view === 'side' && (
                            <>
                                <circle cx={s.rHand.x} cy={s.rHand.y} r="4" fill="#fff" stroke="none" />
                                <line x1={s.rHand.x - 10} y1={s.rHand.y} x2={s.rHand.x + 10} y2={s.rHand.y} strokeWidth="2" />
                            </>
                        )}
                        {s.equipment === 'dumbbells' && (
                            <>
                                <line x1={s.rHand.x - 6} y1={s.rHand.y} x2={s.rHand.x + 6} y2={s.rHand.y} />
                                {view === 'front' && s.lHand && <line x1={s.lHand.x - 6} y1={s.lHand.y} x2={s.lHand.x + 6} y2={s.lHand.y} />}
                            </>
                        )}
                    </g>

                    <g className="animate-pulse">
                        <circle cx={s.torso.end.x} cy={s.torso.end.y} r="8" strokeDasharray="2 4" stroke="#22c55e" strokeWidth="1" fill="none" />
                        <text x={s.torso.end.x + 12} y={s.torso.end.y} fontSize="4" fill="#22c55e" stroke="none" className="font-mono">ENGAGED</text>
                    </g>
                </g>
            </svg>
        );
    };

    return (
        <div className="w-full h-64 bg-black rounded-sm border border-red-900/50 relative overflow-hidden mb-6 flex flex-col shadow-[0_0_20px_rgba(220,38,38,0.15)] group">
            
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-20"></div>
            
            <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 to-transparent">
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span> REC
                </span>
                <span className="text-[10px] text-gray-400 font-mono tracking-widest">
                    {workout.name.toUpperCase()} | {phase === 0 ? 'SETUP' : phase === 1 ? 'FRONT VIEW' : 'SIDE VIEW'}
                </span>
            </div>

            <div className="flex-1 relative flex items-center justify-center z-10 p-4">
                {renderVisuals()}

                {!isPlaying && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 backdrop-blur-sm">
                        <button onClick={handleReplay} className="flex flex-col items-center text-white hover:text-red-500 transition-colors">
                            <RotateCcw size={40} className="mb-2" />
                            <span className="font-bold uppercase tracking-widest text-sm">Replay Demo</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="h-20 bg-zinc-900/90 border-t border-red-900/30 p-3 z-30 relative">
                <div className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">
                    {phase === 0 && 'Step 1: Setup Phase'}
                    {phase === 1 && 'Step 2: Front Mechanics'}
                    {phase === 2 && 'Step 3: Side Profile Check'}
                </div>
                <div className="text-sm text-gray-300 font-medium leading-tight h-10 overflow-hidden">
                    {phase === 0 && instructions.grip}
                    {phase === 1 && instructions.front}
                    {phase === 2 && instructions.side}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800 z-30">
                <div 
                    className="h-full bg-red-600 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(220,38,38,1)]"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}

// Camera Engine for AI Simulation
function CameraEngine({ workout, onComplete, onExit }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [repCount, setRepCount] = useState(0);
    const [phase, setPhase] = useState('setup'); 
    const [analysisData, setAnalysisData] = useState({ accuracy: 0, reps: 0, mistakes: [] });
    const animationFrameId = useRef(null);

    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Camera access denied or unavailable", err);
                    alert("Camera access is required for AI tracking. Please enable it.");
                });
        }
        
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    useEffect(() => {
        if (phase === 'review') return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;
        
        let start = Date.now();
        let currentReps = 0;
        let totalAccuracy = 0;
        let frames = 0;
        let detectedMistakes = new Set();

        const drawLoop = () => {
            if (!video || !canvas) return;
            
            canvas.width = video.clientWidth;
            canvas.height = video.clientHeight;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const time = Date.now() - start;
            const w = canvas.width;
            const h = canvas.height;
            const cx = w/2;

            const joints = {
                head: {x: cx, y: h*0.15, name: 'Head'},
                spine: {x: cx, y: h*0.35, name: 'Core/Spine'},
                lShoulder: {x: cx-35, y: h*0.25, name: 'L-Shoulder'},
                rShoulder: {x: cx+35, y: h*0.25, name: 'R-Shoulder'},
                lElbow: {x: cx-45, y: h*0.4, name: 'L-Elbow'},
                rElbow: {x: cx+45, y: h*0.4, name: 'R-Elbow'},
                lWrist: {x: cx-40, y: h*0.55, name: 'L-Wrist'},
                rWrist: {x: cx+40, y: h*0.55, name: 'R-Wrist'},
                lHip: {x: cx-20, y: h*0.5, name: 'L-Hip'},
                rHip: {x: cx+20, y: h*0.5, name: 'R-Hip'},
                lKnee: {x: cx-25, y: h*0.75, name: 'L-Knee'},
                rKnee: {x: cx+25, y: h*0.75, name: 'R-Knee'},
                lAnkle: {x: cx-25, y: h*0.95, name: 'L-Ankle'},
                rAnkle: {x: cx+25, y: h*0.95, name: 'R-Ankle'},
            };

            const drawBones = (j) => {
                ctx.beginPath();
                ctx.moveTo(j.head.x, j.head.y); ctx.lineTo(j.spine.x, j.spine.y);
                ctx.moveTo(j.lShoulder.x, j.lShoulder.y); ctx.lineTo(j.rShoulder.x, j.rShoulder.y);
                ctx.moveTo(j.spine.x, j.spine.y); ctx.lineTo((j.lHip.x+j.rHip.x)/2, j.lHip.y);
                ctx.moveTo(j.lHip.x, j.lHip.y); ctx.lineTo(j.rHip.x, j.rHip.y);
                ctx.moveTo(j.lShoulder.x, j.lShoulder.y); ctx.lineTo(j.lElbow.x, j.lElbow.y); ctx.lineTo(j.lWrist.x, j.lWrist.y);
                ctx.moveTo(j.rShoulder.x, j.rShoulder.y); ctx.lineTo(j.rElbow.x, j.rElbow.y); ctx.lineTo(j.rWrist.x, j.rWrist.y);
                ctx.moveTo(j.lHip.x, j.lHip.y); ctx.lineTo(j.lKnee.x, j.lKnee.y); ctx.lineTo(j.lAnkle.x, j.lAnkle.y);
                ctx.moveTo(j.rHip.x, j.rHip.y); ctx.lineTo(j.rKnee.x, j.rKnee.y); ctx.lineTo(j.rAnkle.x, j.rAnkle.y);
                ctx.stroke();
            };

            const drawJoints = (j, highlightThresholdY = 0) => {
                Object.values(j).forEach(joint => {
                    if (joint.y > highlightThresholdY) {
                        ctx.beginPath();
                        ctx.arc(joint.x, joint.y, 6, 0, Math.PI*2);
                        ctx.fillStyle = '#ef4444'; 
                        ctx.fill();
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = '#fff';
                        ctx.stroke();
                        
                        ctx.fillStyle = 'rgba(255,255,255,0.9)';
                        ctx.font = '10px monospace';
                        ctx.fillText(joint.name, joint.x + 10, joint.y);
                    }
                });
            };

            if (phase === 'setup') {
                const scanSpeed = 2000; 
                const scanProgress = (time % scanSpeed) / scanSpeed; 
                const laserY = h - (scanProgress * h); 

                ctx.beginPath();
                ctx.moveTo(0, laserY);
                ctx.lineTo(w, laserY);
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 15;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 2;
                drawBones(joints);
                drawJoints(joints, laserY);

            } else if (phase === 'recording') {
                const repDuration = 3000; 
                const repProgress = (time % repDuration) / repDuration; 
                const repCycle = Math.sin(repProgress * Math.PI * 2); 

                const formNoise = Math.sin(time / 300) * 8; 
                const formQualityRaw = 82 + (Math.sin(time / 1000) * 12) + (Math.random() * 6 - 3); 
                const currentAccuracy = Math.min(Math.max(formQualityRaw, 0), 100);
                
                totalAccuracy += currentAccuracy;
                frames++;

                if (currentAccuracy < 76) {
                    if (Math.abs(formNoise) > 6) detectedMistakes.add("Knee valgus (caving inward) detected under load.");
                    else detectedMistakes.add("Core stability lost; spine alignment deviated from neutral.");
                } else if (currentAccuracy < 83 && time % 1000 < 50) {
                    detectedMistakes.add("Uneven weight distribution between left and right joints.");
                }

                const isGoodForm = currentAccuracy > 78;
                const movementOffset = repCycle * 35; 

                let movingJoints = JSON.parse(JSON.stringify(joints)); 
                ['head', 'spine', 'lShoulder', 'rShoulder', 'lHip', 'rHip'].forEach(k => {
                    movingJoints[k].y += movementOffset;
                });
                
                movingJoints.lKnee.x -= (movementOffset * 0.3) + (formNoise * 0.5);
                movingJoints.rKnee.x += (movementOffset * 0.3) - (formNoise * 0.5);
                movingJoints.lKnee.y += movementOffset * 0.5;
                movingJoints.rKnee.y += movementOffset * 0.5;

                ctx.strokeStyle = isGoodForm ? '#22c55e' : '#ef4444'; 
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                drawBones(movingJoints);
                drawJoints(movingJoints, 0);

                ctx.fillStyle = isGoodForm ? '#22c55e' : '#ef4444';
                ctx.font = 'bold 16px monospace';
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 4;
                
                ctx.fillText(`${Math.round(110 + repCycle*40)}°`, movingJoints.rKnee.x + 20, movingJoints.rKnee.y);
                ctx.fillText(`${Math.round(130 + repCycle*30)}°`, movingJoints.rHip.x + 25, movingJoints.rHip.y);
                ctx.fillText(`Accuracy: ${currentAccuracy.toFixed(1)}%`, 15, 30);
                ctx.shadowBlur = 0;

                const simulatedRep = Math.floor(time / repDuration);
                if (simulatedRep > currentReps && simulatedRep <= 5) {
                    currentReps = simulatedRep;
                    setRepCount(currentReps);
                    
                    if (currentReps >= 5) {
                        const avgAcc = Math.round(totalAccuracy / frames);
                        let finalMistakes = Array.from(detectedMistakes);
                        
                        if (avgAcc > 88) finalMistakes = ["Minor shift on eccentric phase, but overall excellent execution."];
                        else if (finalMistakes.length === 0) finalMistakes.push("Slightly incomplete range of motion on Rep 4.");
                        
                        setAnalysisData({ accuracy: avgAcc, reps: 5, mistakes: finalMistakes.slice(0, 3) });
                        
                        setTimeout(() => {
                            setIsRecording(false);
                            setPhase('review');
                        }, 800);
                        return; 
                    }
                }
            }

            animationFrameId.current = requestAnimationFrame(drawLoop);
        };

        drawLoop();
        return () => cancelAnimationFrame(animationFrameId.current);

    }, [phase, isRecording]);

    const startRecording = () => {
        setIsRecording(true);
        setPhase('recording');
        setRepCount(0);
    };

    if (phase === 'review') {
        const isGood = analysisData.accuracy >= 80;
        return (
            <>
                <GlobalStyles />
                <div key="review" className="page-transition h-screen bg-[#050505] text-white flex flex-col p-6">
                    <h2 className="text-2xl font-black italic uppercase text-red-500 border-b border-red-900 pb-4 mb-6">AI Form Analysis</h2>
                    
                    <div className="bg-zinc-900 border border-zinc-800 rounded p-6 mb-6 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                        <h3 className="font-bold text-xl mb-4 text-center">Session Results</h3>
                        <div className="flex justify-between items-center bg-black/50 p-4 mb-2 rounded border border-zinc-800">
                            <span>Completed Reps</span>
                            <span className="font-bold text-red-500 text-xl">{analysisData.reps}/5</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/50 p-4 mb-2 rounded border border-zinc-800">
                            <span>Form Accuracy</span>
                            <span className={`font-bold text-xl ${isGood ? 'text-green-500' : 'text-yellow-500'}`}>
                                {analysisData.accuracy}%
                            </span>
                        </div>
                    </div>

                    <div className={`bg-black/40 border rounded p-6 mb-auto ${isGood ? 'border-green-900' : 'border-red-900'}`}>
                        <h3 className={`font-bold uppercase text-sm mb-3 flex items-center gap-2 ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                            <AlertTriangle size={16}/> Kinematic Feedback
                        </h3>
                        <ul className="list-disc pl-5 text-gray-300 space-y-2 text-sm">
                            {analysisData.mistakes.map((mistake, idx) => (
                                <li key={idx} className="leading-snug">{mistake}</li>
                            ))}
                        </ul>
                    </div>

                    <button 
                      onClick={() => onComplete(analysisData.reps, analysisData.mistakes)}
                      className="w-full bg-red-600 text-white py-4 rounded-sm font-black italic uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] flex justify-center items-center gap-2"
                    >
                      Confirm & Sync Data <CheckCircle size={20} />
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <GlobalStyles />
            <div key="camera" className="page-transition h-screen bg-black relative flex flex-col overflow-hidden">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                
                <canvas 
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />

                <div className="relative z-20 flex-1 flex flex-col justify-between p-6">
                    <div className="flex justify-between items-center bg-black/60 backdrop-blur px-4 py-3 rounded border border-red-500/30">
                        <button onClick={onExit} className="text-red-500"><XCircle size={28} /></button>
                        <div className="text-center">
                            <p className="text-xs uppercase text-red-500 font-bold tracking-widest">{workout.muscle}</p>
                            <p className="font-black text-white">{workout.name}</p>
                        </div>
                        <div className="w-7"></div>
                    </div>

                    {phase === 'setup' && (
                        <div className="bg-black/70 backdrop-blur p-6 text-center border border-red-500/50 my-auto rounded shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                            <div className="w-16 h-16 border-4 border-dashed border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-[spin_4s_linear_infinite]">
                                <Target className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold uppercase italic text-white mb-2">Scanning Joints</h3>
                            <p className="text-sm text-gray-400">AI is mapping your skeletal structure. Stand completely visible in frame.</p>
                        </div>
                    )}

                    <div className="text-center">
                        {phase === 'recording' && (
                            <div className="mb-8">
                                <p className="text-red-500 font-black italic text-6xl drop-shadow-[0_0_15px_rgba(220,38,38,1)]">
                                    {repCount} <span className="text-2xl text-white">/ 5</span>
                                </p>
                                <p className="text-white uppercase tracking-widest text-sm mt-2 font-bold bg-black/50 inline-block px-3 py-1 rounded">AI Tracking Active</p>
                            </div>
                        )}

                        {phase === 'setup' && (
                            <button 
                                onClick={startRecording}
                                className="bg-red-600 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto border-4 border-black ring-4 ring-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse"
                            >
                                <Play fill="currentColor" size={32} className="ml-2" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}