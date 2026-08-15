import React, { createContext, useContext, useState } from "react";
import { Outlet, useOutletContext } from "react-router";

export interface RealisasiLayoutContext {
    activeDraftLaporan: any | null;
    setActiveDraftLaporan: (val: any | null) => void;
    activeTipe: any | null;
    setActiveTipe: (val: any | null) => void;
    activeKecName: string;
    setActiveKecName: (val: string) => void;
    activeDesaName: string;
    setActiveDesaName: (val: string) => void;
    isLoading: boolean;
    setIsLoading: (val: boolean) => void;
}

export function useRealisasiContext(): RealisasiLayoutContext {
    const context = useOutletContext<RealisasiLayoutContext>();
    if (context) return context;
    return {
        activeDraftLaporan: null,
        setActiveDraftLaporan: () => {},
        activeTipe: null,
        setActiveTipe: () => {},
        activeKecName: "",
        setActiveKecName: () => {},
        activeDesaName: "",
        setActiveDesaName: () => {},
        isLoading: false,
        setIsLoading: () => {},
    };
}

export default function RealisasiInfrastrukturLayout() {
    const [activeDraftLaporan, setActiveDraftLaporan] = useState<any | null>(null);
    const [activeTipe, setActiveTipe] = useState<any | null>(null);
    const [activeKecName, setActiveKecName] = useState<string>("");
    const [activeDesaName, setActiveDesaName] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const contextValue: RealisasiLayoutContext = {
        activeDraftLaporan,
        setActiveDraftLaporan,
        activeTipe,
        setActiveTipe,
        activeKecName,
        setActiveKecName,
        activeDesaName,
        setActiveDesaName,
        isLoading,
        setIsLoading,
    };

    return <Outlet context={contextValue} />;
}
