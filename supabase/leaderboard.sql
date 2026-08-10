-- get_topup_leaderboard
CREATE OR REPLACE FUNCTION get_topup_leaderboard(p_month int, p_year int, p_limit int DEFAULT 20)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    total_amount numeric,
    rank bigint
) AS $func$
BEGIN
    RETURN QUERY
    WITH UserTotals AS (
        SELECT 
            t.user_id as uid,
            SUM(t.amount) as total
        FROM topup_requests t
        WHERE t.status = 'approved'
          AND EXTRACT(MONTH FROM t.approved_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_month
          AND EXTRACT(YEAR FROM t.approved_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_year
        GROUP BY t.user_id
    )
    SELECT 
        u.id as user_id,
        u.full_name,
        u.avatar_url,
        ut.total as total_amount,
        RANK() OVER (ORDER BY ut.total DESC) as rank
    FROM UserTotals ut
    JOIN profiles u ON ut.uid = u.id
    ORDER BY total_amount DESC
    LIMIT p_limit;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;


-- get_my_topup_rank
CREATE OR REPLACE FUNCTION get_my_topup_rank(p_month int, p_year int)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    total_amount numeric,
    rank bigint
) AS $func$
BEGIN
    RETURN QUERY
    WITH UserTotals AS (
        SELECT 
            t.user_id as uid,
            SUM(t.amount) as total
        FROM topup_requests t
        WHERE t.status = 'approved'
          AND EXTRACT(MONTH FROM t.approved_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_month
          AND EXTRACT(YEAR FROM t.approved_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_year
        GROUP BY t.user_id
    ),
    RankedUsers AS (
        SELECT 
            ut.uid,
            ut.total,
            RANK() OVER (ORDER BY ut.total DESC) as rank
        FROM UserTotals ut
    )
    SELECT 
        u.id as user_id,
        u.full_name,
        u.avatar_url,
        ru.total as total_amount,
        ru.rank
    FROM RankedUsers ru
    JOIN profiles u ON ru.uid = u.id
    WHERE ru.uid = auth.uid();
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;


-- get_consumption_leaderboard
CREATE OR REPLACE FUNCTION get_consumption_leaderboard(p_month int, p_year int, p_limit int DEFAULT 20)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    total_amount numeric,
    rank bigint
) AS $func$
BEGIN
    RETURN QUERY
    WITH UserTotals AS (
        SELECT 
            o.user_id as uid,
            SUM(o.final_amount) as total
        FROM orders o
        WHERE o.payment_status = 'paid'
          AND o.status NOT IN ('cancelled', 'refunded')
          AND EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_month
          AND EXTRACT(YEAR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_year
        GROUP BY o.user_id
    )
    SELECT 
        u.id as user_id,
        u.full_name,
        u.avatar_url,
        ut.total as total_amount,
        RANK() OVER (ORDER BY ut.total DESC) as rank
    FROM UserTotals ut
    JOIN profiles u ON ut.uid = u.id
    ORDER BY total_amount DESC
    LIMIT p_limit;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;


-- get_my_consumption_rank
CREATE OR REPLACE FUNCTION get_my_consumption_rank(p_month int, p_year int)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    avatar_url text,
    total_amount numeric,
    rank bigint
) AS $func$
BEGIN
    RETURN QUERY
    WITH UserTotals AS (
        SELECT 
            o.user_id as uid,
            SUM(o.final_amount) as total
        FROM orders o
        WHERE o.payment_status = 'paid'
          AND o.status NOT IN ('cancelled', 'refunded')
          AND EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_month
          AND EXTRACT(YEAR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = p_year
        GROUP BY o.user_id
    ),
    RankedUsers AS (
        SELECT 
            ut.uid,
            ut.total,
            RANK() OVER (ORDER BY ut.total DESC) as rank
        FROM UserTotals ut
    )
    SELECT 
        u.id as user_id,
        u.full_name,
        u.avatar_url,
        ru.total as total_amount,
        ru.rank
    FROM RankedUsers ru
    JOIN profiles u ON ru.uid = u.id
    WHERE ru.uid = auth.uid();
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
