import React from 'react';
import { Line } from 'react-chartjs-2';
import { Button } from './ui/button';

interface EnvelopeEditorProps {
  cursorPosition: { line: number; character: number };
}

export const EnvelopeEditor: React.FC<EnvelopeEditorProps> = ({ cursorPosition }) => {
  const [points, setPoints] = React.useState([
    { x: 0, y: 0 },   // Attack start
    { x: 0.1, y: 1 }, // Attack peak
    { x: 0.3, y: 0.7 }, // Decay
    { x: 0.8, y: 0.7 }, // Sustain
    { x: 1, y: 0 },   // Release
  ]);

  const data = {
    labels: points.map((_, index) => index.toString()),
    datasets: [
      {
        label: 'ADSR Envelope',
        data: points,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'ADSR Envelope Editor',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
      },
      x: {
        type: 'linear' as const,
        beginAtZero: true,
        max: 1,
      },
    },
  };

  const handleUpdateEnvelope = () => {
    // ここでVSCode拡張にエンベロープの更新を通知
    const vscode = (window as any).vscode;
    if (vscode) {
      vscode.postMessage({
        type: 'updateEnvelope',
        value: points,
      });
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <Line data={data} options={options} />
      <div className="mt-4">
        <Button onClick={handleUpdateEnvelope}>
          Update Envelope
        </Button>
      </div>
    </div>
  );
}; 