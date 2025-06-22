'use client';

import React, { useState } from 'react';
import { SlideData } from '@/lib/pitch-deck-data';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dot, Mail, ExternalLink, Sparkles } from 'lucide-react';

interface SlideComponentProps {
  slide: SlideData;
}

export const SlideComponent: React.FC<SlideComponentProps> = ({ slide }) => {
  switch (slide.type) {
    case 'title':
      return <TitleSlide slide={slide} />;
    case 'content':
      return <ContentSlide slide={slide} />;
    case 'table':
      return <TableSlide slide={slide} />;
    case 'interactive':
      return <InteractiveSlide slide={slide} />;
    case 'cta':
      return <CTASlide slide={slide} />;
    default:
      return <ContentSlide slide={slide} />;
  }
};

const TitleSlide: React.FC<SlideComponentProps> = ({ slide }) => {
  return (
    <Card className="slide-content w-full max-w-6xl mx-auto bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-sm border-primary/20 p-8 md:p-16 rounded-3xl shadow-2xl">
      <div className="text-center space-y-8 md:space-y-12">
        <div className="space-y-4 md:space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <h2 className="text-2xl md:text-3xl lg:text-4xl text-primary font-semibold italic">
              {slide.subtitle}
            </h2>
          )}
        </div>

        {slide.content.text && (
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
            {slide.content.text}
          </p>
        )}

        <div className="flex justify-center">
          <Badge variant="outline" className="text-sm md:text-lg px-4 md:px-6 py-2 md:py-3 border-primary/30 text-primary">
            AI-Powered Project Management
          </Badge>
        </div>
      </div>
    </Card>
  );
};

const ContentSlide: React.FC<SlideComponentProps> = ({ slide }) => {
  return (
    <Card className="slide-content w-full max-w-6xl mx-auto bg-background/95 backdrop-blur-sm border-primary/20 p-6 md:p-12 rounded-2xl shadow-2xl">
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 md:space-y-4">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <h2 className="text-xl md:text-2xl lg:text-3xl text-primary font-semibold">
              {slide.subtitle}
            </h2>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6 md:space-y-8">
          {slide.content.heading && (
            <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold text-center text-foreground">
              {slide.content.heading}
            </h3>
          )}

          {slide.content.text && (
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed text-center max-w-4xl mx-auto">
              {slide.content.text}
            </p>
          )}

          {slide.content.bullets && (
            <div className="max-w-5xl mx-auto">
              <ul className="space-y-4 md:space-y-6">
                {slide.content.bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-3 md:gap-4 text-sm md:text-base lg:text-lg">
                    <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                      <Dot className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                    </div>
                    <span className="text-foreground leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {slide.content.subheading && (
            <div className="text-center">
              <p className="text-lg md:text-xl lg:text-2xl font-semibold text-primary bg-primary/10 rounded-lg p-3 md:p-4 inline-block">
                {slide.content.subheading}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const TableSlide: React.FC<SlideComponentProps> = ({ slide }) => {
  const table = slide.content.table;
  
  return (
    <Card className="slide-content w-full max-w-6xl mx-auto bg-background/95 backdrop-blur-sm border-primary/20 p-12 rounded-2xl shadow-2xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-foreground tracking-tight">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <h2 className="text-3xl text-primary font-semibold">
              {slide.subtitle}
            </h2>
          )}
        </div>

        {/* Table */}
        {table && (
          <div className="max-w-5xl mx-auto">
            <div className="overflow-x-auto rounded-xl border border-primary/20">
              <table className="w-full min-w-[500px]">
                {table.headers && (
                  <thead className="bg-primary/10">
                    <tr>
                      {table.headers.map((header, index) => (
                        <th key={index} className="px-3 md:px-6 py-3 md:py-4 text-left text-sm md:text-lg font-semibold text-primary">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-primary/10">
                  {table.rows.map((row, index) => (
                    <tr key={index} className="hover:bg-primary/5 transition-colors">
                      {Object.values(row).map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 md:px-6 py-3 md:py-4 text-sm md:text-lg text-foreground">
                          {cellIndex === 0 && typeof cell === 'string' && (cell.includes('%') || cell.includes('x') || cell.includes('/')) ? (
                            <span className="text-xl md:text-2xl lg:text-3xl font-bold text-primary">{cell}</span>
                          ) : (
                            <span className={cellIndex === 0 ? 'font-semibold text-primary' : ''}>{cell}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {slide.content.text && (
          <p className="text-xl text-center text-primary font-semibold bg-primary/10 rounded-lg p-4 max-w-4xl mx-auto">
            {slide.content.text}
          </p>
        )}
      </div>
    </Card>
  );
};

const InteractiveSlide: React.FC<SlideComponentProps> = ({ slide }) => {
  const [output, setOutput] = useState<string>('Click a button above to see AI-powered automation in action!');
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = async (action: string) => {
    setIsLoading(true);
    setOutput('Processing...');

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (action === 'generateTasks') {
      setOutput(`Generated Project Tasks:
1. Requirements Analysis & Technical Specification (Week 1-2)
2. UI/UX Design & Wireframing (Week 2-3)
3. Backend API Development & Database Setup (Week 3-5)
4. Frontend Development & Integration (Week 4-6)
5. Testing, Security Review & Deployment (Week 6-7)`);
    } else if (action === 'summarizeNotes') {
      setOutput(`Meeting Summary:
• Backend API for user authentication is 80% complete, final endpoints needed by Tuesday
• Testing environment delays resolved - DevOps providing access by EOD tomorrow  
• Client approved UI mockups but requested dashboard color scheme changes - Alice following up with design team`);
    }

    setIsLoading(false);
  };

  return (
    <Card className="slide-content w-full max-w-6xl mx-auto bg-background/95 backdrop-blur-sm border-primary/20 p-12 rounded-2xl shadow-2xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-foreground tracking-tight">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <h2 className="text-3xl text-primary font-semibold">
              {slide.subtitle}
            </h2>
          )}
        </div>

        {/* Bullets */}
        {slide.content.bullets && (
          <div className="max-w-4xl mx-auto">
            <ul className="space-y-4">
              {slide.content.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3 text-lg">
                  <Sparkles className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <span className="text-foreground">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactive Buttons */}
        {slide.content.interactive && (
          <div className="interactive-section space-y-4 md:space-y-6">
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {slide.content.interactive.buttons.map((button) => (
                <Button
                  key={button.id}
                  onClick={() => handleButtonClick(button.action)}
                  disabled={isLoading}
                  className="bg-primary hover:bg-accent text-primary-foreground px-4 md:px-6 py-2 md:py-3 text-sm md:text-lg"
                >
                  {button.label}
                </Button>
              ))}
            </div>

            {/* Output Container */}
            <Card className="max-w-4xl mx-auto bg-muted/50 border-primary/20 p-4 md:p-6">
              <div className="text-left">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-foreground font-mono text-xs md:text-sm leading-relaxed">
                    {output}
                  </pre>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
};

const CTASlide: React.FC<SlideComponentProps> = ({ slide }) => {
  const cta = slide.content.cta;

  return (
    <Card className="slide-content w-full max-w-6xl mx-auto bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-sm border-primary/20 p-16 rounded-3xl shadow-2xl">
      <div className="text-center space-y-12">
        {/* Header */}
        <div className="space-y-6">
          <h1 className="text-6xl font-bold text-foreground tracking-tight">
            {slide.title}
          </h1>
          {slide.subtitle && (
            <h2 className="text-3xl text-primary font-semibold">
              {slide.subtitle}
            </h2>
          )}
        </div>

        {cta && (
          <div className="cta-section space-y-8">
            {/* Main CTA Text */}
            <h3 className="text-4xl font-bold text-primary">
              {cta.mainText}
            </h3>

            {slide.content.text && (
              <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                {slide.content.text}
              </p>
            )}

            {/* Benefits */}
            <div className="max-w-2xl mx-auto">
              <h4 className="text-2xl font-semibold text-foreground mb-6">Early Access Benefits:</h4>
              <ul className="space-y-4">
                {cta.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3 text-lg">
                    <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                      <span className="text-success-foreground text-sm">✓</span>
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-6">
              <p className="text-xl text-foreground">
                Contact: <a href={`mailto:${cta.contact.email}`} className="text-primary hover:text-accent transition-colors font-semibold">
                  {cta.contact.email}
                </a>
              </p>

              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-accent text-primary-foreground px-8 py-4 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <a href={`mailto:${cta.contact.email}`} className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {cta.contact.buttonText}
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
