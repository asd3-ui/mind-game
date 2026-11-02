package com.aqlni.game

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LevelPolicyTest {

    @Test
    fun `assessment ratio maps to expected levels`() {
        assertEquals(LevelPolicy.Level.ADVANCED, LevelPolicy.levelFor(9, 10))
        assertEquals(LevelPolicy.Level.EXPERT, LevelPolicy.levelFor(8, 10))
        assertEquals(LevelPolicy.Level.INTERMEDIATE, LevelPolicy.levelFor(6, 10))
        assertEquals(LevelPolicy.Level.ELEMENTARY, LevelPolicy.levelFor(4, 10))
        assertEquals(LevelPolicy.Level.BEGINNER, LevelPolicy.levelFor(2, 10))
        assertEquals(LevelPolicy.Level.INTERMEDIATE, LevelPolicy.levelFor(7, 10))
    }

    @Test
    fun `perfect score advances from expert to expert`() {
        assertEquals(LevelPolicy.Level.EXPERT, LevelPolicy.levelFor(20, 20))
    }

    @Test
    fun `no answers asked is safe`() {
        assertEquals(LevelPolicy.Level.BEGINNER, LevelPolicy.levelFor(3, 0))
    }

    @Test
    fun `negative answered ratio is safe`() {
        // Negative values (never produced by the game) still map sanely.
        assertEquals(LevelPolicy.Level.BEGINNER, LevelPolicy.levelFor(-5, 10))
    }

    @Test
    fun `xp curve is monotonic`() {
        var previous = -1
        for (lvl in 1..10) {
            val needed = LevelPolicy.xpForLevel(lvl)
            assertTrue(needed > previous)
            previous = needed
        }
        assertEquals(0, LevelPolicy.xpForLevel(1))
        assertEquals(150, LevelPolicy.xpForLevel(2))
        assertEquals(300, LevelPolicy.xpForLevel(3))
    }

    @Test
    fun `early worlds are available at level 1`() {
        val unlocked = LevelPolicy.unlockedWorlds(1)
        assertTrue(unlocked.contains("math"))
        assertTrue(unlocked.contains("arabic"))
        assertTrue(unlocked.contains("science"))
        assertTrue(unlocked.contains("general"))
        assertTrue(!unlocked.contains("creative"))
        assertTrue(!unlocked.contains("brain"))
    }

    @Test
    fun `creative and brain unlock by growing`() {
        val lvl2 = LevelPolicy.unlockedWorlds(2)
        assertTrue(lvl2.contains("creative"))
        assertTrue(!lvl2.contains("brain"))
        val lvl3 = LevelPolicy.unlockedWorlds(3)
        assertTrue(lvl3.contains("brain"))
    }
}
