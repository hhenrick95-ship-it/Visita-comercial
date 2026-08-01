import { SlideData, SlideScreenshot, iconMap } from "./TutorialSlides";
import { SlideLayout } from "./SlideLayout";
import logoLopes from "@/assets/logo-lopes.png";
import { ArrowDown } from "lucide-react";

interface SlideRendererProps {
  slide: SlideData;
  slideNumber: number;
  totalSlides: number;
}

const CoverSlide = ({ slide }: { slide: SlideData }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
    <img src={logoLopes} alt="Logo Lopes" className="h-28 mb-4" />
    <h1 className="text-8xl font-bold tracking-tight">{slide.title}</h1>
    {slide.subtitle && (
      <p className="text-3xl opacity-70 whitespace-pre-line leading-relaxed max-w-[1200px]">
        {slide.subtitle}
      </p>
    )}
    <div className="text-2xl opacity-40 mt-8">
      {new Date().toLocaleDateString("pt-BR", { year: "numeric", month: "long" })}
    </div>
  </div>
);

const ScreenshotGallery = ({ screenshots, title, layout }: { screenshots: SlideScreenshot[]; title: string; layout?: string }) => (
  <div className={`${layout === 'vertical' ? 'flex flex-col' : 'flex'} gap-4 items-center justify-center h-full`}>
    {screenshots.map((s, i) => (
      <img
        key={i}
        src={s.url}
        alt={`Screenshot ${i + 1}: ${title}`}
        style={{ 
          [layout === 'vertical' ? 'width' : 'width']: `${s.width ?? Math.floor(100 / screenshots.length)}%`,
          ...(layout === 'vertical' ? { maxHeight: `${Math.floor(100 / screenshots.length)}%` } : {})
        }}
        className="object-contain rounded-xl shadow-2xl border border-white/10"
      />
    ))}
  </div>
);

const getSlideScreenshots = (slide: SlideData): SlideScreenshot[] => {
  if (slide.screenshots && slide.screenshots.length > 0) return slide.screenshots;
  if (slide.screenshotUrl) return [{ url: slide.screenshotUrl, width: 100 }];
  return [];
};

const ContentSlide = ({ slide }: { slide: SlideData }) => {
  const screenshots = getSlideScreenshots(slide);
  const hasScreenshot = screenshots.length > 0 && slide.screenshotPosition !== "none";
  const isLeft = slide.screenshotPosition === "left";

  return (
    <div className="flex-1 flex flex-col gap-8">
      <h2 className="text-6xl font-bold tracking-tight">{slide.title}</h2>
      <div className={`flex-1 flex ${hasScreenshot ? `${isLeft ? 'flex-row-reverse' : 'flex-row'} gap-10` : 'flex-col'} justify-center`}>
        <div className={`flex flex-col justify-center gap-6 ${hasScreenshot ? 'w-[45%]' : 'w-full gap-8'}`}>
          {slide.items?.map((item, i) => {
            const Icon = iconMap[item.icon];
            return (
              <div key={i} className="flex items-start gap-5">
                <div className={`${hasScreenshot ? 'w-12 h-12 rounded-xl' : 'w-16 h-16 rounded-2xl'} bg-white/10 flex items-center justify-center shrink-0`}>
                  {Icon && <Icon className={`${hasScreenshot ? 'w-6 h-6' : 'w-8 h-8'} text-blue-300`} />}
                </div>
                <p className={`${hasScreenshot ? 'text-2xl' : 'text-3xl'} leading-relaxed pt-1`}>{item.text}</p>
              </div>
            );
          })}
        </div>
        {hasScreenshot && (
          <div className="w-[55%] flex items-center justify-center">
            <ScreenshotGallery screenshots={screenshots} title={slide.title} layout={slide.screenshotLayout} />
          </div>
        )}
      </div>
    </div>
  );
};

const TableSlide = ({ slide }: { slide: SlideData }) => (
  <div className="flex-1 flex flex-col gap-10">
    <h2 className="text-6xl font-bold tracking-tight">{slide.title}</h2>
    <div className="flex-1 flex items-center">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {slide.table?.headers.map((h, i) => (
              <th key={i} className="text-left text-2xl font-semibold px-8 py-5 border-b-2 border-white/20 text-blue-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slide.table?.rows.map((row, i) => (
            <tr key={i} className="border-b border-white/10">
              {row.map((cell, j) => (
                <td key={j} className="text-2xl px-8 py-5 opacity-90">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const DiagramSlide = ({ slide }: { slide: SlideData }) => (
  <div className="flex-1 flex flex-col gap-10">
    <h2 className="text-6xl font-bold tracking-tight">{slide.title}</h2>
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      {slide.diagramNodes?.map((node, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className={`${node.color} px-12 py-6 rounded-2xl text-3xl font-semibold shadow-lg min-w-[500px] text-center`}>
            {node.label}
          </div>
          {i < (slide.diagramNodes?.length || 0) - 1 && (
            <ArrowDown className="w-10 h-10 my-2 opacity-50" />
          )}
        </div>
      ))}
      {slide.subtitle && (
        <p className="text-2xl opacity-60 mt-8 whitespace-pre-line text-center max-w-[1000px] leading-relaxed">
          {slide.subtitle}
        </p>
      )}
    </div>
  </div>
);

const HighlightSlide = ({ slide }: { slide: SlideData }) => {
  const screenshots = getSlideScreenshots(slide);
  const hasScreenshot = screenshots.length > 0 && slide.screenshotPosition !== "none";
  const isLeft = slide.screenshotPosition === "left";

  return (
    <div className="flex-1 flex flex-col gap-10">
      <h2 className="text-6xl font-bold tracking-tight">{slide.title}</h2>
      <div className={`flex-1 flex ${hasScreenshot ? `${isLeft ? 'flex-row-reverse' : 'flex-row'} gap-10` : 'flex-col'} items-center justify-center`}>
        <div className={`flex flex-col items-center justify-center gap-6 text-center ${hasScreenshot ? 'w-[45%]' : 'w-full'}`}>
          <div className="text-9xl font-black text-blue-400 tracking-wider">
            {slide.highlightValue}
          </div>
          <div className="text-4xl font-semibold opacity-80">{slide.highlightLabel}</div>
          <p className="text-2xl opacity-60 max-w-[1000px] leading-relaxed mt-4">
            {slide.highlightDescription}
          </p>
        </div>
        {hasScreenshot && (
          <div className="w-[55%] flex items-center justify-center">
            <ScreenshotGallery screenshots={screenshots} title={slide.title} layout={slide.screenshotLayout} />
          </div>
        )}
      </div>
    </div>
  );
};

export const SlideRenderer = ({ slide, slideNumber, totalSlides }: SlideRendererProps) => {
  const renderSlideContent = () => {
    switch (slide.type) {
      case "cover": return <CoverSlide slide={slide} />;
      case "content": return <ContentSlide slide={slide} />;
      case "table": return <TableSlide slide={slide} />;
      case "diagram": return <DiagramSlide slide={slide} />;
      case "highlight": return <HighlightSlide slide={slide} />;
      default: return <ContentSlide slide={slide} />;
    }
  };

  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} showLogo={slide.type !== "cover"}>
      {renderSlideContent()}
    </SlideLayout>
  );
};
