'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Color palette data extracted from tailwind.config.ts
const colorPalettes = {
  brown_sugar: {
    name: 'Brown Sugar',
    description: 'Primary brand color - warm and inviting',
    shades: {
      50: '#fdf8f6',
      100: '#f2e8e5',
      200: '#eaddd7',
      300: '#e0cec5',
      400: '#d2bab0',
      500: '#c57b57', // Primary
      600: '#b86f4a',
      700: '#a05a3a',
      800: '#8a4a2f',
      900: '#723c26',
    }
  },
  rich_black: {
    name: 'Rich Black',
    description: 'Deep, sophisticated black with subtle blue undertones',
    shades: {
      50: '#f0f9fa',
      100: '#daecee',
      200: '#b8dce1',
      300: '#87c3cc',
      400: '#4f9fae',
      500: '#357f93',
      600: '#2d677c',
      700: '#285465',
      800: '#264654',
      900: '#001011', // Primary
    }
  },
  seasalt: {
    name: 'Seasalt',
    description: 'Clean, fresh off-white for light backgrounds',
    shades: {
      50: '#f4f7f5', // Primary
      100: '#e6ebe8',
      200: '#cdd8d1',
      300: '#a9beb0',
      400: '#7e9d88',
      500: '#5f7f6a',
      600: '#4a6554',
      700: '#3d5245',
      800: '#334339',
      900: '#2d3831',
    }
  },
  hunter_green: {
    name: 'Hunter Green',
    description: 'Success states and positive actions',
    shades: {
      50: '#f0f9f4',
      100: '#dcf2e4',
      200: '#bce5cd',
      300: '#8dd1a7',
      400: '#57b67a',
      500: '#436436', // Primary
      600: '#2f7c47',
      700: '#28633a',
      800: '#245030',
      900: '#1f4129',
    }
  },
  chocolate_cosmos: {
    name: 'Chocolate Cosmos',
    description: 'Error states and destructive actions',
    shades: {
      50: '#fdf2f2',
      100: '#fce7e7',
      200: '#fbd4d4',
      300: '#f8b4b4',
      400: '#f28b8b',
      500: '#e85d5d',
      600: '#d73f3f',
      700: '#b42f2f',
      800: '#952929',
      900: '#5c1a1b', // Primary
    }
  }
};

// Semantic colors from CSS variables
const semanticColors = {
  'Background': '#001011', // rich_black-900
  'Foreground': '#f4f7f5', // seasalt-50
  'Primary': '#c57b57', // brown_sugar-500
  'Secondary': '#8a4a2f', // brown_sugar-800
  'Muted': '#723c26', // brown_sugar-900
  'Accent': '#a05a3a', // brown_sugar-700
  'Success': '#57b67a', // hunter_green-400
  'Destructive': '#952929', // chocolate_cosmos-800
  'Border': '#8a4a2f', // brown_sugar-800
  'Input': '#723c26', // brown_sugar-900
  'Ring': '#d2bab0', // brown_sugar-400
};

// Current chat UI colors
const chatColors = {
  'Chat Background': '#723c26', // brown_sugar-900 darker
  'Chat User Message': '#d2bab0', // brown_sugar-400
  'Chat Agent Message': '#723c26', // brown_sugar-900
  'Chat User Border': '#c57b57', // brown_sugar-500
  'Chat Agent Border': '#8a4a2f', // brown_sugar-800
  'Chat Timestamp': '#e0cec5', // brown_sugar-300
};

// Sidebar colors for reference
const sidebarColors = {
  'Sidebar Background': '#001011', // rich_black-900
  'Sidebar Text': '#f4f7f5', // seasalt-50
  'Sidebar Hover': '#8a4a2f', // brown_sugar-800
  'Sidebar Primary': '#d2bab0', // brown_sugar-400
  'Sidebar Accent': '#5c1a1b', // chocolate_cosmos-900
};

interface ColorCardProps {
  name: string;
  hex: string;
  shade?: string;
  description?: string;
  isPrimary?: boolean;
}

const ColorCard: React.FC<ColorCardProps> = ({ name, hex, shade, description, isPrimary }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy color:', err);
    }
  };

  return (
    <div 
      className="relative group cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
      onClick={copyToClipboard}
    >
      <div 
        className="w-full h-24 rounded-lg border-2 border-zinc-700 relative overflow-hidden"
        style={{ backgroundColor: hex }}
      >
        {/* Copy indicator */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 flex items-center justify-center">
          {copied ? (
            <Check className="w-6 h-6 text-white drop-shadow-lg" />
          ) : (
            <Copy className="w-5 h-5 text-white/0 group-hover:text-white/80 transition-all duration-200 drop-shadow-lg" />
          )}
        </div>
        
        {/* Primary indicator */}
        {isPrimary && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-semibold">
            PRIMARY
          </div>
        )}
      </div>
      
      <div className="mt-3 text-center">
        <div className="font-medium text-white text-sm">
          {name} {shade && <span className="text-zinc-400">({shade})</span>}
        </div>
        <div className="font-mono text-xs text-zinc-400 mt-1">{hex}</div>
        {description && (
          <div className="text-xs text-zinc-500 mt-1 leading-tight">{description}</div>
        )}
      </div>
    </div>
  );
};

export default function ColorPalettePage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-brown_sugar-400 to-brown_sugar-600 bg-clip-text text-transparent">
            Barka Color Palette
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Complete color system for the Barka frontend. Click any color to copy its hex code to clipboard.
          </p>
        </div>

        {/* Brand Color Palettes */}
        <div className="space-y-12">
          {Object.entries(colorPalettes).map(([key, palette]) => (
            <div key={key} className="bg-zinc-800 rounded-xl p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">{palette.name}</h2>
                <p className="text-zinc-400">{palette.description}</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-4">
                {Object.entries(palette.shades).map(([shade, hex]) => (
                  <ColorCard
                    key={shade}
                    name={palette.name}
                    hex={hex}
                    shade={shade}
                    isPrimary={
                      (key === 'brown_sugar' && shade === '500') ||
                      (key === 'rich_black' && shade === '900') ||
                      (key === 'seasalt' && shade === '50') ||
                      (key === 'hunter_green' && shade === '500') ||
                      (key === 'chocolate_cosmos' && shade === '900')
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Semantic Colors */}
        <div className="mt-12 bg-zinc-800 rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Semantic Colors</h2>
            <p className="text-zinc-400">CSS variable-based colors used throughout the application</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(semanticColors).map(([name, hex]) => (
              <ColorCard
                key={name}
                name={name}
                hex={hex}
                description="CSS Variable"
              />
            ))}
          </div>
        </div>

        {/* Current Chat UI Colors */}
        <div className="mt-12 bg-zinc-800 rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Current Chat UI Colors</h2>
            <p className="text-zinc-400">Colors currently used in the chat interface</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(chatColors).map(([name, hex]) => (
              <ColorCard
                key={name}
                name={name}
                hex={hex}
                description="Chat UI"
              />
            ))}
          </div>
        </div>

        {/* Sidebar Colors for Reference */}
        <div className="mt-12 bg-zinc-800 rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Sidebar Colors</h2>
            <p className="text-zinc-400">Colors used in the sidebar for reference</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(sidebarColors).map(([name, hex]) => (
              <ColorCard
                key={name}
                name={name}
                hex={hex}
                description="Sidebar"
              />
            ))}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-12 bg-zinc-800 rounded-xl p-8">
          <h2 className="text-2xl font-semibold mb-4">Usage Instructions</h2>
          <div className="space-y-4 text-zinc-300">
            <p>• <strong>Click any color</strong> to copy its hex code to clipboard</p>
            <p>• <strong>Primary colors</strong> are marked with a yellow badge</p>
            <p>• <strong>Semantic colors</strong> are mapped to CSS variables for consistent theming</p>
            <p>• <strong>Chat UI colors</strong> show the current color scheme used in the chat interface</p>
            <p>• <strong>Sidebar colors</strong> are provided for reference to maintain design consistency</p>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-12 text-center">
          <Button 
            onClick={() => window.history.back()}
            className="bg-brown_sugar-500 hover:bg-brown_sugar-600 text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
