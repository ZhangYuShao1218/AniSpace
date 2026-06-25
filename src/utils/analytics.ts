import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let isInitialized = false;

export const initGA = () => {
  if (GA_MEASUREMENT_ID && !isInitialized) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    isInitialized = true;
    console.log('GA4 Initialized');
  }
};

export const logPageView = (path: string) => {
  if (isInitialized) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
};

export const logEvent = (category: string, action: string, label?: string, value?: number) => {
  if (isInitialized) {
    ReactGA.event({
      category,
      action,
      label,
      value
    });
  }
};
