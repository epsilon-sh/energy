// File: ButtonBar.tsx
import React from 'react';
import { CircleFadingArrowUp, Radio, Cog } from 'lucide-react'; // Import icons from Lucide React package

export const ButtonBar: React.FC = () => {
    return (
        <div className="button-bar top-left">
            <button><CircleFadingArrowUp /></button>
            <button><Radio /></button>
            <button></button>
            <button><Cog /></button>
        </div>
    );
};