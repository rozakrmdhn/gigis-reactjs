import { X, List } from "lucide-react";
import { Button } from "~/components/ui/button";

interface PanelHeaderProps {
    title: string;
    onClose: () => void;
}

export const PanelHeader = ({ title, onClose }: PanelHeaderProps) => {
    return (
        <div className="px-4 py-3 flex items-center justify-between border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-100 dark:shadow-blue-900/40">
                    <List className="w-4 h-4" />
                </div>
                <h2 className="text-[12px] font-black text-slate-700 dark:text-slate-200 tracking-tight uppercase">{title}</h2>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" 
                onClick={onClose}
            >
                <X className="w-4 h-4" />
            </Button>
        </div>
    );
};
