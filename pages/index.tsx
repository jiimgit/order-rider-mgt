import dynamic from 'next/dynamic'

const DeliveryPlatform = dynamic(() => import('../components/DeliveryPlatform'), {
  ssr: false,
})

export default function Home() {
  return <DeliveryPlatform />
}
