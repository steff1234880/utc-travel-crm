export default function About() {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">About Universal Travel Company</h1>
          <p className="text-lg text-slate-600">Discover our story, our mission, and why we are your perfect travel partner.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Company Profile</h2>
            <p className="text-slate-600 text-lg mb-4 leading-relaxed">
              Founded with a passion for exploration, Universal Travel Company has grown into a premier travel agency dedicated to crafting unforgettable experiences. We specialize in luxury tours, corporate travel, and customized vacations tailored precisely to your preferences.
            </p>
            <p className="text-slate-600 text-lg leading-relaxed">
              Our team of seasoned travel experts works tirelessly to ensure every detail of your journey is perfect. From the moment you contact us to your safe return home, we are with you every step of the way.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-xl h-96">
            <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop" alt="Our Team" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-8 bg-slate-50 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-2xl font-bold text-blue-600 mb-4">Our Vision</h3>
            <p className="text-slate-600">To be the world's most trusted and innovative travel management company, setting new standards in personalized service.</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-2xl font-bold text-blue-600 mb-4">Our Mission</h3>
            <p className="text-slate-600">To deliver extraordinary travel experiences by combining expert knowledge, exclusive access, and unparalleled customer care.</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-2xl font-bold text-blue-600 mb-4">Our Values</h3>
            <p className="text-slate-600">Integrity, Excellence, Passion, Innovation, and a commitment to Sustainable Tourism.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
