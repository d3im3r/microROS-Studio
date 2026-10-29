import { Studio } from "@/features/workspace";
export default function Page() { return <Studio e2eDefaultAuth={process.env.NEXT_E2E === "1"} />; }
