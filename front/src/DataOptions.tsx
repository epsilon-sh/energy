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
    const [info, setInfo] = useState<{ data: ConsumptionData, info: { totals: number } } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    console.log({ data, meteringPoint })

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]?.name.endsWith('.csv') ? e.target.files[0] : null;
        setFile(file);
        setInfo(null);
        if (!file) return;

        console.log({ file });

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
                setSearchParams(prev => {
                    Object.entries(updates).forEach(([key, value]) => prev.set(key, value))
                    return prev
                })
            }
        }

        console.log({ updates })
    }, [data])

    return (
        <div className="container">
            <Card className="backdrop bg-shadow-light">
                <CardHeader>
                    <h3 className="my-0">Consumption Data</h3>
                    {data[1] && (
                        <table>
                            <tbody>
                                <tr>
                                    <td>Meter</td>
                                    <td>{data[0].meteringPoint}</td>
                                </tr>
                                <tr>
                                    <td>Start</td>
                                    <td>{data[0].startTime.toISOString().slice(0, -8)}</td>
                                </tr>
                                <tr>
                                    <td>End</td>
                                    <td>{data[data.length - 1].startTime.toISOString().slice(0, -8)}</td>
                                </tr>
                                <tr>
                                    <td>Count</td>
                                    <td>{data.length}</td>
                                </tr>
                                <tr>
                                    <td>Totals</td>
                                    <td>{data.reduce((acc: number, m: typeof data[0]) => +m.quantity + acc, 0).toFixed(6)}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </CardHeader>
                <CardTitle className="my-s">
                    Import Consumption Data
                </CardTitle>
                <div className="flex flex-col gap-s p-4">
                    <div className="flex flex-col gap-s">
                        {/* <pre>{JSON.stringify(consumptionData, null, 2)}</pre> */}
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="block w-full"
                            disabled={uploading}
                        />
                    </div>

                    {error && (
                        <p className="text-error my-0">{error}</p>
                    )}

                    {info ? (
                        <p className="text-success my-0">
                            {JSON.stringify(info)}
                        </p>
                    ) : file && data && (
                        <>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className={`flex gap-s items-center w-fit ${uploading ? 'opacity-50' : ''} ${error ? 'bg-error' : 'bg-primary'}`}>
                                <Upload size={16} />
                                {uploading ? 'Uploading...' : 'Upload Measurements'}
                            </button>
                        </>
                    )}

                    <div className="mt-s">
                        <a href="https://www.fingrid.fi/sahkomarkkinat/datahub/kirjautuminen-datahubin-asiakasportaaliin/"
                            target="_blank"
                            rel="noopener"
                            className="decoration-dashed text-primary">
                            Request data from Fingrid
                        </a>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default DataOptions;
