import Card, { CardHeader, CardTitle } from "@ui/Card";
import { Upload } from 'lucide-react';
import { useState, useEffect } from "react";
import { useSearchParams } from 'react-router-dom';
import { parseDsv } from '../../fingrid/parseImport.mjs'
import consumptionData, { ConsumptionData } from '../../fingrid/consumptionData.mjs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8989/api';

const DataOptions = () => {
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<ConsumptionData>(consumptionData);
    const [searchParams, setSearchParams] = useSearchParams();
    const meteringPoint = searchParams.get('meteringPoint') || 'TEST_METERINGPOINT';
    const [info, setInfo] = useState<{ count: number, message: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (files: FileList | null) => {
        const file = files?.[0]?.name.endsWith('.csv') ? files[0] : null;
        setFile(file);
        setInfo(null);
        if (!file) return;

        console.log(file);

        try {
            const text = await file.text();
            const measurements = parseDsv(text);
            if (!measurements?.length)
                return setError('No valid measurements found in file');
            else setData(new ConsumptionData(...measurements))

        } catch (err) {
            console.error('Failed to parse file:', err);
            setError('Format error.');
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${API_URL}/consumption/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok)
                throw new Error('Upload failed');

            const result = await response.json();
            setFile(null);
            setInfo(result);

        } catch (err) {
            console.error('Upload failed:', err);
            setError('Failed to upload measurements');
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        const updates: Record<string, string> = {}

        if (data[0]) {
            if (meteringPoint !== data[0].meteringPoint)
                updates.meteringPoint = data[0].meteringPoint
            if (!searchParams.get('start') || new Date(data[0].startTime) < new Date(searchParams.get('start')!))
                updates.start = data[0].startTime.toISOString()
            if (!searchParams.get('end') || new Date(data[data.length - 1].startTime) > new Date(searchParams.get('end')!))
                updates.end = data[data.length - 1].startTime.toISOString()
            if (Object.keys(updates).length) {
                console.log({ updates })
                setSearchParams(prev => {
                    Object.entries(updates).forEach(([key, value]) => prev.set(key, value))
                    return prev
                })
            }
        }
    }, [data])

    return (
        <div className="container">
            <Card className="backdrop bg-shadow-light">
                <CardHeader>
                    <h3 className="my-0">Consumption Data</h3>

                    <div className="mt-s">
                        <a href="https://www.fingrid.fi/sahkomarkkinat/datahub/kirjautuminen-datahubin-asiakasportaaliin/"
                            target="_blank"
                            rel="noopener"
                            className="decoration-dashed text-primary">
                            Request data from Fingrid
                        </a>
                    </div>
                </CardHeader>

                <div className="flex gap-s my-s">
                    <FilesInput handleChange={handleFileChange} uploading={uploading} />
                    <DataInfo data={data} />
                </div>

                <DataError error={error} />

                <DataFooter>

                    <button
                        onClick={handleUpload}
                        disabled={uploading || !file || !data?.length}
                        className={`flex gap-s items-center w-fit ${uploading ? 'opacity-50' : ''} ${error ? 'bg-error' : 'bg-primary'}`}>
                        <Upload size={16} />
                        {uploading ? 'Uploading...' : 'Upload Measurements'}
                    </button>

                    <p className="text-success my-0">
                        {info && info.message}
                    </p>

                </DataFooter>
            </Card >
        </div >
    );
};

export default DataOptions;


const DataInfo = ({ data }: { data: ConsumptionData[] }) => {
    if (!data?.[0]) return null;

    const info = {
        Meter: data[0].meteringPoint,
        Start: data[0].startTime.toDateString(),
        End: data[data.length - 1].startTime.toDateString(),
        Count: data.length,
        Total: data.reduce((acc: number, m: typeof data[0]) => +m.quantity + acc, 0).toFixed()
    }

    return <table className="border-separate border-spacing-x-2">{data?.[0] &&
        <tbody>
            {Object.entries(info).map(([key, value]) => (
                <tr key={key}>
                    <td style={{ fontWeight: 'bold' }}>{key}</td>
                    <td style={{ paddingLeft: '10px' }}>{value}</td>
                </tr>
            ))}
        </tbody>}
    </table>
}

const DataError = ({ error }: { error: string | null }) =>
    error && (
        <p className="text-error my-0">{error}</p>
    )

const FilesInput = ({ handleChange, uploading }: { handleChange: (files: FileList | null) => void, uploading: boolean }) => {
    const [active, setActive] = useState(false);
    const handleDrag = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault()
        e.stopPropagation()

        const targetActive = e.type === 'dragover' || e.type === 'dragenter'
        setActive(targetActive)
    }

    return <div style={{ border: `5px dashed ${active ? 'var(--color-accent)' : 'var(--color-accent-hover)'}`, borderRadius: '10px' }} className="flex flex-col gap-s w-fit">
        <input
            id="consumption-data-input"
            type="file"
            accept=".csv"
            onChange={e => handleChange(e.target.files)}
            disabled={uploading}
            style={{ display: 'none' }}
        />
        <label htmlFor="consumption-data-input" className="p-4"
            onDragOver={e => handleDrag(e)}
            onDragEnter={e => handleDrag(e)}
            onDragLeave={e => handleDrag(e)}
            onDrop={e => {
                e.preventDefault()
                handleChange(e.dataTransfer?.files)
            }}>
            <CardTitle className="my-s">
                Click / drop to import a consumption data CSV file.
            </CardTitle>
        </label>
    </div>
}
const DataFooter = ({ children }: { children: React.ReactNode }) =>
    <div className="flex-col">
        {children}
    </div>
