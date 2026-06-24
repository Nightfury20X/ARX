# ARX Data Handoff Files

These files were generated from the UCI Online Retail proxy dataset plus the ARX MVP scoring/model pipeline.

Important identity note: the `arx_###` company IDs are synthetic borrower buckets created by grouping UCI Retail customers into demo ARX borrower accounts. They are not real companies. Mike's `Demo AI Co` rows are fake demo application records.

## Anish
- File: anish_behavioral_connector_sample.csv
- Purpose: target output shape for Mixpanel/Amplitude connector work.
- Important: behavior values are synthetic ARX behavior, not real Mixpanel or Amplitude data.
- Use it to match the CompanySignals object fields.

- File: anish_config_template.json
- Purpose: config template for event-name mapping per design partner.
- Important: every company names AI accept/regenerate events differently.

## Financial data metrics flow
- File: financial_data_metrics_for_visualization.csv
- Flow: Kiran -> Anish visualization metrics -> Akil finance review.
- Purpose for Anish: visualize financial metrics and make them understandable.
- Purpose for Akil: review credit/finance meaning after the metrics are organized.
- Important: this is UCI Online Retail transformed into a financial proxy. It is not live Stripe data.

## Vaibhav
- File: vaibhav_dashboard_latest_scores.csv
- Purpose: latest dashboard score records.
- Use capital_ready_score as higher = healthier.
- composite_risk_score_legacy is included only if using the older lower = healthier PDF logic.

- File: vaibhav_dashboard_8_week_trend.csv
- Purpose: sample trend/sparkline data for the last 8 weekly records.

- File: company_name_map.csv
- Purpose: presentation-safe display-name layer that maps synthetic arx_### IDs to realistic fictional company names.
- Important: do not modify the original scoring CSVs or imply these are real companies. The names are for demo readability only.

## Mike
- File: mike_application_demo_companies.csv
- Purpose: fake/demo application records for Zapier/Airtable/application flow.

## Stripe note
We are not using a live Stripe pipeline yet because there are no live design partners. For MVP, UCI Retail is the financial proxy. Future Stripe fields should replace mrr, arr, mrr_change_pct, cancellation_rate, and top_customer_concentration.
