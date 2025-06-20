import type { Config } from "tailwindcss";

// Barka Color Palette
const brown_sugar = {
	50: '#fdf8f6',
	100: '#f2e8e5',
	200: '#eaddd7',
	300: '#e0cec5',
	400: '#d2bab0',
	500: '#c57b57', // Primary Brown Sugar
	600: '#b86f4a',
	700: '#a05a3a',
	800: '#8a4a2f',
	900: '#723c26',
};

const rich_black = {
	50: '#f0f9fa',
	100: '#daecee',
	200: '#b8dce1',
	300: '#87c3cc',
	400: '#4f9fae',
	500: '#357f93',
	600: '#2d677c',
	700: '#285465',
	800: '#264654',
	900: '#001011', // Primary Rich Black
};

const seasalt = {
	50: '#f4f7f5', // Primary Seasalt
	100: '#e6ebe8',
	200: '#cdd8d1',
	300: '#a9beb0',
	400: '#7e9d88',
	500: '#5f7f6a',
	600: '#4a6554',
	700: '#3d5245',
	800: '#334339',
	900: '#2d3831',
};

const hunter_green = {
	50: '#f0f9f4',
	100: '#dcf2e4',
	200: '#bce5cd',
	300: '#8dd1a7',
	400: '#57b67a',
	500: '#436436', // Primary Hunter Green
	600: '#2f7c47',
	700: '#28633a',
	800: '#245030',
	900: '#1f4129',
};

const chocolate_cosmos = {
	50: '#fdf2f2',
	100: '#fce7e7',
	200: '#fbd4d4',
	300: '#f8b4b4',
	400: '#f28b8b',
	500: '#e85d5d',
	600: '#d73f3f',
	700: '#b42f2f',
	800: '#952929',
	900: '#5c1a1b', // Primary Chocolate Cosmos
};

const config: Config = {
	darkMode: ["class"],
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				'supply-bold': ['var(--font-supply-bold)'],
				'geist-sans': ['var(--font-geist-sans)'],
				'geist-mono': ['var(--font-geist-mono)'],
				'supply-regular': ['var(--font-supply-regular)'], // if you add this to layout
				'supply-medium': ['var(--font-supply-medium)'],   // if you add this to layout
				'supply-light': ['var(--font-supply-light)'],     // if you add this to layout
			},
			colors: {
				// Barka Brand Colors
				brown_sugar,
				rich_black,
				seasalt,
				hunter_green,
				chocolate_cosmos,

				// Semantic Color Mappings
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
