/**
 * Profile Management - Multi-user support for family
 * Stored in localStorage, no authentication needed
 */

const STORAGE_KEY = 'deutschesecho_profiles';
const ACTIVE_PROFILE_KEY = 'deutschesecho_active';

// Default profile colors
const AVATAR_COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6'  // purple
];

/**
 * Get all profiles from localStorage
 */
export function getProfiles() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        // Create default profile on first launch
        const defaultProfile = createDefaultProfile();
        saveProfiles([defaultProfile]);
        setActiveProfile(defaultProfile.id);
        return [defaultProfile];
    }
    return JSON.parse(stored);
}

/**
 * Get active profile
 */
export function getActiveProfile() {
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const profiles = getProfiles();

    if (!activeId) {
        const first = profiles[0];
        setActiveProfile(first.id);
        return first;
    }

    return profiles.find(p => p.id === activeId) || profiles[0];
}

/**
 * Set active profile
 */
export function setActiveProfile(profileId) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('profileChanged', { detail: { profileId } }));
}

/**
 * Create new profile
 */
export function createProfile(name) {
    const profiles = getProfiles();

    if (profiles.length >= 5) {
        throw new Error('Maximum 5 profiles allowed');
    }

    const newProfile = {
        id: `profile_${Date.now()}`,
        name: name || `User ${profiles.length + 1}`,
        color: AVATAR_COLORS[profiles.length % AVATAR_COLORS.length],
        xp: 0,
        level: 1,
        streak: 0,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        stats: {
            vocabLearned: 0,
            grammarCompleted: 0,
            readingCompleted: 0,
            speakingCompleted: 0,
            totalExercises: 0
        }
    };

    profiles.push(newProfile);
    saveProfiles(profiles);

    return newProfile;
}

/**
 * Update profile
 */
export function updateProfile(profileId, updates) {
    const profiles = getProfiles();
    const index = profiles.findIndex(p => p.id === profileId);

    if (index === -1) return null;

    profiles[index] = { ...profiles[index], ...updates };

    // Auto-update level based on XP
    profiles[index].level = Math.floor(profiles[index].xp / 100) + 1;

    saveProfiles(profiles);

    // Dispatch event if this is active profile
    if (profileId === localStorage.getItem(ACTIVE_PROFILE_KEY)) {
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: profiles[index] }));
    }

    return profiles[index];
}

/**
 * Delete profile
 */
export function deleteProfile(profileId) {
    const profiles = getProfiles();

    if (profiles.length === 1) {
        throw new Error('Cannot delete last profile');
    }

    const filtered = profiles.filter(p => p.id !== profileId);
    saveProfiles(filtered);

    // If deleted profile was active, switch to first profile
    if (profileId === localStorage.getItem(ACTIVE_PROFILE_KEY)) {
        setActiveProfile(filtered[0].id);
    }
}

/**
 * Award XP to active profile
 */
export function awardXP(points, reason) {
    const profile = getActiveProfile();
    const oldLevel = profile.level;

    const updated = updateProfile(profile.id, {
        xp: profile.xp + points
    });

    const newLevel = updated.level;
    const leveledUp = newLevel > oldLevel;

    // Show XP animation
    showXPAnimation(points, reason);

    // Show level up modal if leveled up
    if (leveledUp) {
        showLevelUpModal(newLevel);
    }

    return { leveledUp, newLevel };
}

/**
 * Update streak
 */
export function updateStreak() {
    const profile = getActiveProfile();
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = new Date(profile.lastLogin).toISOString().split('T')[0];

    if (lastLogin === today) {
        return { message: 'Already checked in today!', streak: profile.streak };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak;
    if (lastLogin === yesterdayStr) {
        // Consecutive day
        newStreak = profile.streak + 1;
    } else {
        // Broken streak
        newStreak = 1;
    }

    const bonusXP = newStreak * 10;

    updateProfile(profile.id, {
        streak: newStreak,
        lastLogin: new Date().toISOString(),
        xp: profile.xp + 20 + bonusXP // 20 base + streak bonus
    });

    return {
        message: `${newStreak}-day streak! 🔥`,
        streak: newStreak,
        bonusXP: bonusXP + 20
    };
}

// Private helpers

function saveProfiles(profiles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function createDefaultProfile() {
    return {
        id: `profile_${Date.now()}`,
        name: 'Me',
        color: AVATAR_COLORS[0],
        xp: 0,
        level: 1,
        streak: 0,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        stats: {
            vocabLearned: 0,
            grammarCompleted: 0,
            readingCompleted: 0,
            speakingCompleted: 0,
            totalExercises: 0
        }
    };
}

function showXPAnimation(points, reason) {
    const container = document.createElement('div');
    container.className = 'xp-popup';
    container.innerHTML = `
        <div class="xp-popup-content">
            <span class="xp-amount">+${points} XP</span>
            ${reason ? `<span class="xp-reason">${reason}</span>` : ''}
        </div>
    `;

    document.body.appendChild(container);

    // Animate and remove
    setTimeout(() => container.classList.add('show'), 10);
    setTimeout(() => {
        container.classList.remove('show');
        setTimeout(() => container.remove(), 300);
    }, 2000);
}

function showLevelUpModal(newLevel) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'level-up-modal';
    modal.innerHTML = `
        <div class="level-up-content">
            <div class="confetti"></div>
            <h2>🎉 Level Up! 🎉</h2>
            <div class="level-display">Level ${newLevel}</div>
            <p>You're making amazing progress!</p>
            <button onclick="this.closest('.level-up-modal').remove()" class="btn-primary">
                Continue Learning
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Trigger confetti animation
    setTimeout(() => modal.querySelector('.confetti').classList.add('active'), 100);
}

// Make globally accessible
window.profileManager = {
    getProfiles,
    getActiveProfile,
    setActiveProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    awardXP,
    updateStreak
};
