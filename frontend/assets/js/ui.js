
export const ui = {
    showToast: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');

        let bgClass, icon;
        if (type === 'success') {
            bgClass = 'bg-green-500 text-white';
            icon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
        } else if (type === 'error') {
            bgClass = 'bg-red-500 text-white';
            icon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
        } else {
            bgClass = 'bg-blue-500 text-white';
            icon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
        }

        toast.className = `${bgClass} flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] toast-enter`;
        toast.innerHTML = `
            ${icon}
            <span class="font-medium text-sm">${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(100%)';
            toast.style.transition = 'all 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    setLoading: (buttonId, isLoading) => {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        const loader = btn.querySelector('#loader');
        const text = btn.querySelector('span');

        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            if (loader) loader.classList.remove('hidden');
            // Optional: hide text or just show loader alongside
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            if (loader) loader.classList.add('hidden');
        }
    },

    initMobileMenu: () => {
        // Remove any existing listeners to prevent duplicates (not strictly necessary if called once, but good practice)
        // Since we can't easily remove anonymous listeners, we'll just set up a delegated listener on the body
        // But we need to ensure we don't attach it multiple times if this function is called multiple times.
        // A simple flag on the body can help.
        if (document.body.dataset.mobileMenuInitialized) return;

        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('#mobileMenuBtn');
            const closeBtn = e.target.closest('#closeSidebarBtn');
            const sidebar = document.querySelector('aside');
            const overlay = document.getElementById('sidebar-overlay');

            if (btn && sidebar) {
                e.preventDefault();
                sidebar.classList.toggle('hidden');
                sidebar.classList.toggle('flex');
            }

            if (closeBtn && sidebar) {
                e.preventDefault();
                sidebar.classList.add('hidden');
                sidebar.classList.remove('flex');
            }
        });

        document.body.dataset.mobileMenuInitialized = 'true';
    }
};
