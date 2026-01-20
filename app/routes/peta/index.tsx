import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TabPeta } from "./tab-peta";
import { TabPetaKecamatan } from "./tab-peta-kecamatan";
import type { Route } from "./+types/index";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Peta / Map" },
        { name: "description", content: "Peta Location" },
    ];
}

export default function PetaPage() {
    return (
        <div className="flex flex-1 flex-col h-full w-full p-4 gap-4">

            <Tabs defaultValue="peta" className="w-full flex-1 flex flex-col">
                <div className="flex items-center">
                    <TabsList>
                        <TabsTrigger value="peta">Peta Jalan Desa</TabsTrigger>
                        <TabsTrigger value="tab-peta-kecamatan">Peta Kecamatan</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="peta" className="flex-1 flex flex-col">
                    <TabPeta />
                </TabsContent>

                <TabsContent value="tab-peta-kecamatan" className="flex-1 flex flex-col">
                    <TabPetaKecamatan />
                </TabsContent>
            </Tabs>
        </div>
    );
}
