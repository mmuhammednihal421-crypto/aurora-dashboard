
import { useEffect } from "react";

const REMINDERS = [
  {
    time: "07:00",
    message:
      "Good morning, Nihal! It's time for your morning walk. Let's start the day with energy.",
  },
  {
    time: "08:30",
    message:
      "Nihal, it's breakfast time. Have a good meal and get ready for your class.",
  },
  {
    time: "09:00",
    message:
      "It's class time, Nihal! Stay focused and make the most of your learning.",
  },
  {
    time: "12:00",
    message:
      "Time to study, Nihal. Focus on your goals and make this session count.",
  },
  {
    time: "14:15",
    message:
      "Nihal, it's lunchtime. Take a break and recharge for the afternoon.",
  },
  {
    time: "15:00",
    message:
      "It's time to work, Nihal. Let's make steady progress on your tasks.",
  },
  {
    time: "17:00",
    message:
      "Take a short break, Nihal. It's snack time!",
  },
  {
    time: "19:00",
    message:
      "Your evening study session starts now, Nihal. Stay consistent!",
  },
  {
    time: "21:00",
    message:
      "Nihal, it's Python practice time. Keep building your programming skills.",
  },
  {
    time: "21:30",
    message:
      "Nihal, it's dinner time. Take a break, enjoy your meal, and recharge for the rest of your evening.",
  },
  {
    time: "22:00",
    message:
      "It's English practice time, Nihal. Keep improving a little every day.",
  },
  {
    time: "23:30",
    message:
      "Nihal, it's bedtime. You've done your best today. Put your devices away, get some rest, and prepare for a fresh start tomorrow. Good night!",
  },
];

function getPreferredVoice() {
  const voices = window.speechSynthesis.getVoices();

  return (
    voices.find(
      (voice) =>
        /rishi/i.test(voice.name) &&
        /en-IN/i.test(voice.lang)
    ) ||
    voices.find(
      (voice) => /rishi/i.test(voice.name)
    ) ||
    voices.find(
      (voice) =>
        /en-IN/i.test(voice.lang) &&
        /male/i.test(voice.name)
    ) ||
    null
  );
}

function speakMessage(message) {
  const utterance = new SpeechSynthesisUtterance(message);

  utterance.voice = getPreferredVoice();
  utterance.lang = "en-IN";
  utterance.rate = 0.9;
  utterance.pitch = 0.9;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function VoiceAssistant({
  enabled = true,
  actual = {},
  targets = {},
}) {
  useEffect(() => {
    if (!enabled || !("speechSynthesis" in window)) return;

    const spokenToday = new Set();

    function checkSchedule() {
      const now = new Date();
      const time =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");

      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      const reminder = REMINDERS.find((item) => item.time === time);
      if (!reminder) return;

      const key = `${date}-${reminder.time}`;
      if (spokenToday.has(key)) return;

      spokenToday.add(key);

      const routineMessages = {
        "07:00": "walk",
        "09:00": "class",
        "12:00": "study",
        "15:00": "work",
        "19:00": "study",
        "21:00": "practice",
        "22:00": "english",
      };

      const activityId = routineMessages[reminder.time];

      let message = reminder.message;

      if (activityId) {
        const target = Number(targets[activityId] || 0);
        const completed = Number(actual[activityId] || 0);
        const remaining = Math.max(0, target - completed);

        if (target > 0) {
          if (completed >= target) {
            message = `Great job, Nihal! You have completed your ${activityId} target of ${target} hours. Keep up the good work!`;
          } else {
            message = `Nihal, your ${activityId} target is ${target} hours. You have completed ${completed} hours, with ${remaining} hours remaining. Let's keep going!`;
          }
        }
      }

      speakMessage(message);
    }

    checkSchedule();
    const intervalId = window.setInterval(checkSchedule, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  return null;
}
