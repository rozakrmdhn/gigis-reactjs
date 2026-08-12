import { useState, useEffect } from 'react';
import { infrastrukturService, type InfrastrukturTipe } from '~/services/infrastruktur.service';

export function useInfrastrukturTipe() {
    const [tipes, setTipes] = useState<InfrastrukturTipe[]>([]);
    const [activeTipe, setActiveTipe] = useState<InfrastrukturTipe | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        let isMounted = true;
        infrastrukturService.getTipeList()
            .then(data => {
                if (isMounted) {
                    setTipes(data);
                }
            })
            .catch(err => {
                console.error('Failed to fetch infrastructure types:', err);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    return { tipes, activeTipe, setActiveTipe, isLoading };
}
