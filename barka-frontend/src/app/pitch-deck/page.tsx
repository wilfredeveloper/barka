'use client';

import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Circle, Dot } from 'lucide-react';
import { pitchDeckSlides, SlideData } from '@/lib/pitch-deck-data';
import { Button } from '@/components/ui/button';
import { SlideComponent } from '@/components/pitch-deck/SlideComponents';

const PitchDeckPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Initialize GSAP animations
  useEffect(() => {
    // Set initial state for all slides
    slideRefs.current.forEach((slide, index) => {
      if (slide) {
        gsap.set(slide, {
          opacity: index === 0 ? 1 : 0,
          x: index === 0 ? 0 : '100%',
          zIndex: index === 0 ? 10 : 1
        });
      }
    });
  }, []);

  // Handle slide transitions
  const goToSlide = (slideIndex: number) => {
    if (isAnimating || slideIndex === currentSlide || slideIndex < 0 || slideIndex >= pitchDeckSlides.length) {
      return;
    }

    setIsAnimating(true);
    const currentSlideEl = slideRefs.current[currentSlide];
    const nextSlideEl = slideRefs.current[slideIndex];

    if (currentSlideEl && nextSlideEl) {
      const direction = slideIndex > currentSlide ? 1 : -1;

      // Set up next slide
      gsap.set(nextSlideEl, {
        opacity: 1,
        x: direction > 0 ? '100%' : '-100%',
        zIndex: 10
      });

      // Animate transition with enhanced easing
      const tl = gsap.timeline({
        onComplete: () => {
          setCurrentSlide(slideIndex);
          setIsAnimating(false);
          gsap.set(currentSlideEl, { zIndex: 1 });
        }
      });

      // Slide out current with subtle scale
      tl.to(currentSlideEl, {
        x: direction > 0 ? '-100%' : '100%',
        scale: 0.95,
        duration: 0.8,
        ease: 'power2.inOut'
      })
      // Slide in next with scale animation
      .to(nextSlideEl, {
        x: '0%',
        duration: 0.8,
        ease: 'power2.inOut'
      }, 0)
      .fromTo(nextSlideEl,
        { scale: 1.05 },
        { scale: 1, duration: 0.8, ease: 'power2.inOut' },
        0
      );

      // Enhanced content animation
      const content = nextSlideEl.querySelector('.slide-content');
      if (content) {
        // Reset content elements
        gsap.set(content.querySelectorAll('h1, h2, h3, p, ul, .cta-section, table, .interactive-section'), {
          opacity: 0,
          y: 40,
          scale: 0.95
        });

        // Animate content elements with stagger
        gsap.to(content.querySelectorAll('h1, h2, h3, p, ul, .cta-section, table, .interactive-section'), {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.15,
          delay: 0.4,
          ease: 'power3.out'
        });

        // Special animation for list items
        const listItems = content.querySelectorAll('li');
        if (listItems.length > 0) {
          gsap.set(listItems, { opacity: 0, x: -20 });
          gsap.to(listItems, {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.8,
            ease: 'power2.out'
          });
        }

        // Special animation for buttons
        const buttons = content.querySelectorAll('button');
        if (buttons.length > 0) {
          gsap.set(buttons, { opacity: 0, scale: 0.8 });
          gsap.to(buttons, {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.1,
            delay: 1,
            ease: 'back.out(1.7)'
          });
        }
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goToSlide(currentSlide + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToSlide(currentSlide - 1);
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(pitchDeckSlides.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide]);

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  // Touch/Swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-rich_black-900 via-rich_black-800 to-chocolate_cosmos-900"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barka Logo */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50">
        <Image
          src="/barka-logo.svg"
          alt="Barka Platform"
          width={100}
          height={32}
          className="filter brightness-0 invert md:w-[120px] md:h-[40px]"
        />
      </div>

      {/* Slides Container */}
      <div className="relative w-full h-full">
        {pitchDeckSlides.map((slide, index) => (
          <div
            key={slide.id}
            ref={(el) => (slideRefs.current[index] = el)}
            className="absolute inset-0 w-full h-full flex items-center justify-center p-8"
          >
            <SlideComponent slide={slide} />
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col md:flex-row items-center gap-3 md:gap-4 z-50">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={prevSlide}
            disabled={currentSlide === 0 || isAnimating}
            className="bg-background/20 backdrop-blur-sm border-primary/30 text-primary hover:bg-primary/20 text-xs md:text-sm"
          >
            <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden md:inline">Previous</span>
          </Button>

          {/* Slide Indicators */}
          <div className="flex gap-1.5 md:gap-2">
            {pitchDeckSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                disabled={isAnimating}
                className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-primary scale-125'
                    : 'bg-primary/30 hover:bg-primary/60'
                }`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={nextSlide}
            disabled={currentSlide === pitchDeckSlides.length - 1 || isAnimating}
            className="bg-background/20 backdrop-blur-sm border-primary/30 text-primary hover:bg-primary/20 text-xs md:text-sm"
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>

        {/* Slide Counter - Mobile */}
        <div className="md:hidden text-seasalt-50 text-xs font-medium bg-background/20 backdrop-blur-sm rounded-full px-3 py-1">
          {currentSlide + 1} / {pitchDeckSlides.length}
        </div>
      </div>

      {/* Slide Counter - Desktop */}
      <div className="hidden md:block absolute top-4 right-4 md:top-8 md:right-8 z-50 text-seasalt-50 text-sm font-medium bg-background/20 backdrop-blur-sm rounded-full px-3 py-1">
        {currentSlide + 1} / {pitchDeckSlides.length}
      </div>
    </div>
  );
};



export default PitchDeckPage;
