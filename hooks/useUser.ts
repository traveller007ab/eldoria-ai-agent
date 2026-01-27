
import { useQuery } from "convex/react";
import { api } from "../backend/convex/_generated/api";

export function useUser() {
    // For now, we fetch the first user as the "current" user
    const user = useQuery(api.functions.getProfile);

    return {
        user,
        isLoading: user === undefined,
        userId: user?._id
    };
}
