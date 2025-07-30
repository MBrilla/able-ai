import { start } from "repl";
import RehireContainer from "./RehireContainer";

// Mock fetch function (can be moved to a shared file later)
const fetchRehireData = async (buyerUserId: string, gigId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return {
    originalGig: {
      workerName: "Jerimiah Jones",
      role: "Bartender",
      originalDate: "Tuesday",
      originalLocation: "Central Station",
      startTime: "18:00",
      endTime: "22:00",
    },
    workerForRehire: {
      workerId: "jerimiah-jones-id",
      name: "Jerimiah Jones",
      avatarUrl: "/images/avatar-jerimiah.jpg",
      role: "Bartender",
      ableGigs: 15,
      experienceYears: "3+",
      reviewKeywords: ["lively", "professional", "hardworking"],
      proposedHourlyRate: 15,
      proposedHours: 4,
      platformFeePercent: 6.5,
      paymentProviderFeeFixed: 0.2,
      paymentProviderFeePercent: 1.5,
    },
  };
 
  return null;
};

interface RehirePageProps {
  params: Promise<{ userId: string; gigId: string }>;
}

export default async function RehirePage({ params }: RehirePageProps) {
  const { userId, gigId } = await params;
  
  // Fetch mock data server-side
  const data = await fetchRehireData(userId, gigId);
  const startParts = (data?.originalGig.startTime ?? "00:00").split(":");
  const endParts = (data?.originalGig.endTime ?? "00:00").split(":");

  const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
  const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

  const timeDifference = (endMinutes - startMinutes) / 60;

  return <RehireContainer initialData={data} userId={userId} timeDifference={timeDifference.toString()} />;
}
