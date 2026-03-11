import random

class Revolver:
    def __init__(self, chambers: int = 6):
        self.chambers = chambers
        self.bullet_position = random.randint(0, chambers - 1)
        self.current_chamber = 0
        self.shots_fired = 0

    def pull_trigger(self) -> bool:
        """Returns True if the player is shot (eliminated)."""
        fired = self.current_chamber == self.bullet_position
        self.current_chamber = (self.current_chamber + 1) % self.chambers
        self.shots_fired += 1
        return fired

    def reset(self):
        self.bullet_position = random.randint(0, self.chambers - 1)
        self.current_chamber = 0
        self.shots_fired = 0

    def get_state(self) -> dict:
        return {
            "chambers": self.chambers,
            "shots_fired": self.shots_fired,
        }
