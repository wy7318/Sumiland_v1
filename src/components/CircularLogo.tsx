import { motion } from 'framer-motion';

export function CircularLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-[500px] mx-auto"
    >
      {/* Circular Container */}
      <div className="relative w-full pt-[100%]">
        {/* Circular Border */}
        <div className="absolute inset-0 rounded-full border-4 border-primary-500 bg-white shadow-lg" />
        
        {/* Logo Container */}
        <div className="absolute inset-0 flex items-center justify-center p-[15%]">
          <img
            src="https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/Sumiland%20Design//SUMIL&SUB%20STUDIO%20LOGO.png"
            alt="Sumiland & Sub Studio Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </motion.div>
  );
}