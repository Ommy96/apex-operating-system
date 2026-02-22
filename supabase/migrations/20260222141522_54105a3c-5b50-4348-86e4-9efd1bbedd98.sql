UPDATE financial_transactions 
SET donor_name = 'NSP-AID', 
    description = REPLACE(description, 'NSP-AD', 'NSP-AID'),
    updated_at = now()
WHERE id = '432b1cbc-b0f1-44ed-b5aa-8ddce2c70130' AND donor_name = 'NSP-AD';