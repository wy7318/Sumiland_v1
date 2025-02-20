import { motion } from 'framer-motion';

export function LogoSection() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="absolute top-20 left-8 z-30"
    >
      <img
        src="https://jaytpfztifhtzcruxguj.supabase.co/storage/v1/object/public/Sumiland%20Design//SUMIL&SUB%20STUDIO%20LOGO.png"
        alt="Sumiland & Sub Studio Logo"
        className="w-38 md:w-54"
      />
    </motion.div>
  );
}