import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Expo web HTML shell — injects the same pencil-wobble SVG filters
 * used by the Vite mini-hompy (`index.html` + `.sk-outline`).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <title>Your Diary</title>
      </head>
      <body>
        <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
          <defs>
            <filter id="pencil-wobble" x="-4%" y="-4%" width="108%" height="108%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.045"
                numOctaves={2}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="1.8"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            <filter
              id="pencil-wobble-light"
              x="-2%"
              y="-2%"
              width="104%"
              height="104%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.06"
                numOctaves={1}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="0.9"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
