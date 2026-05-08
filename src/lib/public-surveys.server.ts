import { cache } from "react";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface PublicSurveyPreview {
  id: string;
  title: string;
  description: string | null;
}

export const getPublicSurveyPreview = cache(
  async (surveyId: string): Promise<PublicSurveyPreview | null> => {
    if (!surveyId) {
      return null;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("surveys")
        .select("id, title, description")
        .eq("id", surveyId)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        console.error("Failed to load public survey preview", error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        description: data.description,
      };
    } catch (error) {
      console.error("Failed to initialize public survey preview lookup", error);
      return null;
    }
  },
);
