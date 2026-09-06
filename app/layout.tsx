import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'A6 · 奶油风基装漫游', description: '190㎡户型，瓷砖、奶油色墙面与吊顶。无家具三维空间漫游。' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {return <html lang="zh-CN"><body>{children}</body></html>}
