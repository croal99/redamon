'use client'

import { useCallback, useEffect, useState } from "react"
import { useAuth } from '@/providers/AuthProvider'
import { OnlineClientsCard } from './components/OnLineClient'
import { CenterToolbar } from './components/CenterToolbar/CenterToolbar'
import styles from './page.module.css'
import { ClientView } from './components/ClientView'
import type { CenterClientInfo } from './types/center'

export default function C2Page() {
    const { user, isAuthenticated, isLoading } = useAuth()
    const [currentClient, setCurrentClient] = useState<CenterClientInfo | null>(null)

    const handleConnectClient = useCallback((client: CenterClientInfo) => {
        setCurrentClient(client)
    }, [])

    useEffect(() => {
    }, [])


    return (
        <div className={styles.page}>
            <CenterToolbar />

            {currentClient ? (
                <ClientView client={currentClient} onBack={() => setCurrentClient(null)} />
            ) : (
                <OnlineClientsCard onConnectClient={handleConnectClient} />
            )}
        </div>
    )
}
