// Simple static legal / help page — reused for CGU, privacy, help.
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/Screen";
import { colors, spacing, radius } from "@/src/theme";

const PAGES: Record<string, { title: string; sections: { h: string; p: string }[] }> = {
  terms: {
    title: "Conditions d'utilisation",
    sections: [
      { h: "1. Objet", p: "MatchUp met en relation des joueurs de football amateur. En créant un compte, tu acceptes ces conditions." },
      { h: "2. Comportement", p: "Respecte les autres joueurs. Tout signalement peut entraîner un bannissement du service." },
      { h: "3. Contenu", p: "Tu es responsable des contenus (photos, messages, sondages) que tu publies. Contenu illicite → suppression + signalement autorité." },
      { h: "4. Match & Blessures", p: "MatchUp facilite l'organisation mais n'est pas responsable des incidents sur le terrain. Assure-toi d'être en forme et couvert par une assurance." },
      { h: "5. Vie privée", p: "Voir la Politique de Confidentialité pour comprendre comment tes données sont traitées." },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    sections: [
      { h: "Données collectées", p: "Email, nom, photo, ville, préférences de jeu, historique de match, géolocalisation approximative (avec ton accord)." },
      { h: "Usage", p: "Améliorer les recommandations de groupes, faciliter les échanges, envoyer des notifications pertinentes." },
      { h: "Partage", p: "Aucune donnée n'est vendue. Uniquement partagée avec des sous-traitants (hébergement, notifications, analytics) sous contrat RGPD." },
      { h: "Tes droits", p: "Accès, rectification, suppression : contact@matchup.app. Réponse sous 30 jours." },
      { h: "Cookies", p: "Aucun cookie publicitaire. Seulement session et préférences fonctionnelles." },
    ],
  },
  help: {
    title: "Centre d'aide",
    sections: [
      { h: "Comment rejoindre un groupe ?", p: "Onglet Explorer → touche un groupe → Demander à rejoindre. L'admin recevra ta demande et pourra l'accepter." },
      { h: "Comment créer un match ?", p: "Depuis un groupe dont tu es membre : Matchs → + Ajouter. Une notification est envoyée à tous les membres." },
      { h: "Sondage dans le chat", p: "Icône 📊 dans la barre du chat pour créer un sondage. Idéal pour voter la date/heure d'un match." },
      { h: "Signaler un joueur", p: "Sur son profil : icône ... → Signaler. Notre équipe traite chaque signalement sous 24h." },
      { h: "Contact", p: "support@matchup.app · réponse sous 48h ouvrées." },
    ],
  },
};

export default function LegalPage() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const router = useRouter();
  const content = PAGES[page ?? "terms"] || PAGES.terms;

  return (
    <Screen testID={`legal-${page}`}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{content.title}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}>
        {content.sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.p}>{s.p}</Text>
          </View>
        ))}
        <Text style={styles.footer}>MatchUp · v1.0.0 · Mise à jour {new Date().toLocaleDateString("fr-FR")}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 18, color: colors.text, flex: 1, textAlign: "center", marginHorizontal: 8 },
  section: {
    padding: spacing.base,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h: { fontFamily: "BarlowCondensed-Bold", color: colors.text, fontSize: 17, marginBottom: 6, letterSpacing: -0.2 },
  p: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  footer: { fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 16 },
});
