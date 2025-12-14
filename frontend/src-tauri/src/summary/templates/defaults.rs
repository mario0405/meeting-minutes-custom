/// Embedded default templates using compile-time inclusion
///
/// These templates are bundled into the binary and serve as fallbacks
/// when custom templates are not available.

/// Internal meeting template (German)
pub const INTERNES_MEETING: &str = include_str!("../../../templates/internes_meeting.json");

/// Customer meeting template (German)
pub const KUNDENMEETING: &str = include_str!("../../../templates/kundenmeeting.json");

/// Registry of all built-in templates
///
/// Maps template identifiers to their embedded JSON content
pub fn get_builtin_templates() -> Vec<(&'static str, &'static str)> {
    vec![
        ("internes_meeting", INTERNES_MEETING),
        ("kundenmeeting", KUNDENMEETING),
    ]
}

/// Get a built-in template by identifier
///
/// # Arguments
/// * `id` - Template identifier (e.g., "internes_meeting", "kundenmeeting")
///
/// # Returns
/// The template JSON content if found, None otherwise
pub fn get_builtin_template(id: &str) -> Option<&'static str> {
    match id {
        "internes_meeting" => Some(INTERNES_MEETING),
        "kundenmeeting" => Some(KUNDENMEETING),
        _ => None,
    }
}

/// List all built-in template identifiers
pub fn list_builtin_template_ids() -> Vec<&'static str> {
    vec!["internes_meeting", "kundenmeeting"]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_templates_valid_json() {
        for (id, content) in get_builtin_templates() {
            let result = serde_json::from_str::<serde_json::Value>(content);
            assert!(
                result.is_ok(),
                "Built-in template '{}' contains invalid JSON: {:?}",
                id,
                result.err()
            );
        }
    }

    #[test]
    fn test_get_builtin_template() {
        assert!(get_builtin_template("internes_meeting").is_some());
        assert!(get_builtin_template("kundenmeeting").is_some());
        assert!(get_builtin_template("nonexistent").is_none());
    }
}
