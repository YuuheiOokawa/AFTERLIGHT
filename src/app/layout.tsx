import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'AFTERLIGHT ― 未明の継承者',description:'選ばれなかった未来をつなぐ、縦持ちタップRPG。',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'AFTERLIGHT'},icons:{icon:'/assets/generated/compass.png',apple:'/assets/generated/compass.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#081521'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>;}
