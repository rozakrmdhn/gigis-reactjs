import { Info } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator as UISeparator } from '~/components/ui/separator';
import { type GeoJSONFeature } from '../types';

interface InfoPanelProps {
    selectedJalan: GeoJSONFeature | null;
    isPanelVisible: boolean;
    setIsPanelVisible: (visible: boolean) => void;
}

export function InfoPanel({ selectedJalan, isPanelVisible, setIsPanelVisible }: InfoPanelProps) {
    if (!selectedJalan) return null;

    return (
        <div className="absolute top-14 left-3 z-10 flex flex-col items-start gap-2">
            <Button
                variant="secondary"
                size="icon"
                className="shadow-md h-9 w-9"
                onClick={() => setIsPanelVisible(!isPanelVisible)}
                title="Tampilkan Informasi"
            >
                <Info className="h-5 w-5" />
            </Button>

            {isPanelVisible && (
                <Card className="py-1 w-80 shadow-lg gap-2 max-h-[85vh] overflow-auto">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-2">
                        <CardTitle className="text-sm font-bold">
                            {selectedJalan.properties.nama_ruas}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-3">
                        <UISeparator />
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p className="text-muted-foreground font-semibold">Kode Ruas</p>
                                <p>{selectedJalan.properties.kode_ruas}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-semibold">Lokasi</p>
                                <p>{selectedJalan.properties.desa}, {selectedJalan.properties.kecamatan}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-semibold">Panjang</p>
                                <p>{selectedJalan.properties.panjang.toLocaleString()} m</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-semibold">Lebar</p>
                                <p>{selectedJalan.properties.lebar} m</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-semibold">Perkerasan</p>
                                <p>{selectedJalan.properties.perkerasan}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-semibold">Kondisi</p>
                                <p>{selectedJalan.properties.kondisi}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-semibold">Status Awal</p>
                                <p>{selectedJalan.properties.status_awal}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-semibold">Status Eksisting</p>
                                <p>{selectedJalan.properties.status_eksisting}</p>
                            </div>
                        </div>
                        <UISeparator />
                        <div className="text-[10px] text-muted-foreground pt-1">
                            <p>Sumber Data: {selectedJalan.properties.sumber_data}</p>
                            <p>Terakhir Update: {selectedJalan.properties.updated_at ? new Date(selectedJalan.properties.updated_at).toLocaleDateString() : '-'}</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
