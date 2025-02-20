import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const words = ["WEBSITE", "BRANDING", "PACKAGE", "RESTAURANT", "LOGO"];
const TYPING_SPEED = 150;
const DELETING_SPEED = 75;
const PAUSE_TIME = 2000;

export function TypingEffect() {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentWord = words[wordIndex];

    if (isDeleting) {
      // Deleting text
      if (text === '') {
        // When text is fully deleted, move to next word
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      } else {
        // Continue deleting
        timeout = setTimeout(() => {
          setText(text.slice(0, -1));
        }, DELETING_SPEED);
      }
    } else {
      // Typing text
      if (text === currentWord) {
        // When word is complete, pause then start deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, PAUSE_TIME);
      } else {
        // Continue typing
        timeout = setTimeout(() => {
          setText(currentWord.slice(0, text.length + 1));
        }, TYPING_SPEED);
      }
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex]);

  return (
    <div className="absolute top-24 right-8 font-medium text-3xl flex items-center gap-3">
      <span className="text-primary-600">WE DESIGN :</span>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="inline-block min-w-[250px]"
      >
        <span className="text-gray-800">{text}</span>
        <span className="inline-block w-0.5 h-8 ml-1 bg-primary-500 animate-blink" />
      </motion.div>
    </div>
  );
}