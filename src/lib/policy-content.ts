import policy from "@/content/policies.json";

export const POLICY_VERSION = policy.version;

/** The exact Terms and Privacy text archived under orders.terms_version. */
export function getPolicyContent() {
  return [
    `TsokoLitaw checkout policies — version ${policy.version}`,
    `Last updated: ${policy.lastUpdated}`,
    ...[
      { title: "Terms & Conditions", sections: policy.terms },
      { title: "Privacy Policy", sections: policy.privacy },
    ].flatMap(({ title, sections }) => [
      title,
      ...sections.flatMap(({ heading, paragraphs }) => [heading, ...paragraphs]),
    ]),
  ].join("\n\n");
}
