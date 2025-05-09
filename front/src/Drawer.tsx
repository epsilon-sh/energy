import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Drawer: React.FC = () => {
  const [meteringPoints, setMeteringPoints] = useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const selectedMeteringPoint = searchParams.get('meteringPoint');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8989';

  useEffect(() => {
    fetch(new URL('/meteringPoints', API_URL))
      .then(res => res.json())
      .then(points => setMeteringPoints(points.filter(Boolean)));
  }, []);

  return (
    <>
      <input type="checkbox" id="drawer-toggle" className="drawer-toggle display-none" />
      <label htmlFor="drawer-toggle" className="drawer-button">
        <span /><span /><span />
      </label>
      <label htmlFor="drawer-toggle" className="drawer-overlay" />
      <nav className="drawer">
        <h3>Metering Points</h3>
        <ul className="metering-points-list">
          {meteringPoints.map(id => (
            <li key={id} className={selectedMeteringPoint === id ? 'active' : ''}>
              <a href={`?meteringPoint=${id}`}>{id}</a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default Drawer;
