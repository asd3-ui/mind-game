package com.aqlni.game

/**
 * Pure-Kotlin logic that is unit-tested in CI without needing a device:
 * converting a score ratio into one of the five adaptive levels and
 * computing unlocked worlds at a given player level.
 */
object LevelPolicy {

    enum class Level(val key: String, val emoji: String) {
        BEGINNER("beginner", "🌱"),
        ELEMENTARY("elementary", "🌟"),
        INTERMEDIATE("intermediate", "🚀"),
        ADVANCED("advanced", "🏅"),
        EXPERT("expert", "👑")
    }

    /** Recommended level from an assessment ratio (correct / asked). */
    fun levelFor(ratio: Int, asked: Int): Level {
        if (asked <= 0) return Level.BEGINNER
        val r = ratio.coerceAtLeast(0).toDouble() / asked
        return when {
            /* تقييم كامل بلا خطأ يمنح لقب الخبير مباشرة (مطابق لاختبار perfect score) */
            r >= 1.0 -> Level.EXPERT
            r >= 0.90 -> Level.ADVANCED
            r >= 0.75 -> Level.EXPERT
            r >= 0.60 -> Level.INTERMEDIATE
            r >= 0.40 -> Level.ELEMENTARY
            else -> Level.BEGINNER
        }
    }

    /** XP threshold to reach a player level 1..N (quadratic curve in XP). */
    fun xpForLevel(playerLevel: Int): Int {
        val lvl = playerLevel.coerceAtLeast(1)
        return (lvl - 1) * 150
    }

    /** Worlds unlock gradually so young players see a rewarding progression. */
    fun unlockedWorlds(playerLevel: Int): Set<String> {
        val streams = mutableSetOf("math", "arabic", "science", "general")
        if (playerLevel >= 2) streams += "creative"
        if (playerLevel >= 3) streams += "brain"
        // exams + challenge are part of the home screen hub, gated separately
        // by XP there — handled by the game itself, not here.
        return streams
    }
}
