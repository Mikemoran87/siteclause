const TAB_CONFIG = [
  { id: 'overview', icon: '🏠', label: 'Overview' },
  { id: 'contract', icon: '📄', label: 'Contract' },
  { id: 'correspondence', icon: '💬', label: 'Messages' },
  { id: 'variations', icon: '📋', label: 'Variations' },
  { id: 'notices', icon: '📨', label: 'Notices' },
  { id: 'chat', icon: '🤖', label: 'Chat' },
]

interface Props {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-6">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
              activeTab === tab.id ? 'text-[#F59E0B]' : 'text-gray-400'
            }`}
          >
            <span className="text-xl leading-none mb-0.5">{tab.icon}</span>
            <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
