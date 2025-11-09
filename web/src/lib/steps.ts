import { PixelArtStep, PixelStroke } from './types';

export interface TimelineEvent {
  id: string;
  stepIndex: number;
  type: 'pixel' | 'tool';
  strokes: PixelStroke[];
}

export function buildTimelineEvents(steps: PixelArtStep[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  steps.forEach((step, stepIndex) => {
    if (step.tool && step.pixels.length) {
      events.push({
        id: `tool-${stepIndex}`,
        stepIndex,
        type: 'tool',
        strokes: step.pixels,
      });
    } else {
      step.pixels.forEach((stroke, pixelIndex) => {
        events.push({
          id: `px-${stepIndex}-${pixelIndex}`,
          stepIndex,
          type: 'pixel',
          strokes: [stroke],
        });
      });
    }
  });
  return events;
}
