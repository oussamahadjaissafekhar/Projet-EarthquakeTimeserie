'use client';
// Wrapper that wires react-plotly.js to the lighter plotly.js-dist-min bundle
// This avoids the "Can't resolve plotly.js/dist/plotly" error in Next.js.
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';

const Plot = createPlotlyComponent(Plotly as any);

export default Plot;
