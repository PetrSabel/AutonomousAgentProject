;; domain file: domain-deliveroo.pddl
(define (domain default)
    (:requirements :strips)
    (:predicates
        (carry ?me)
        (tile ?t)
        (delivery ?t)
        (agent ?a)
        (parcel ?p)
        (me ?a)
        (at ?agentOrParcel ?tile)
        (right ?t1 ?t2)
        (left ?t1 ?t2)
        (up ?t1 ?t2)
        (down ?t1 ?t2)
    )
    
    (:action right
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (right ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )

    (:action left
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (left ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )

    (:action up
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (up ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )

    (:action down
        :parameters (?me ?from ?to)
        :precondition (and
            (me ?me)
            (at ?me ?from)
            (down ?from ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
        )
    )

    (:action putdown
        :parameters (?me ?pos)
        :precondition (and
            (me ?me)
            (tile ?pos)
            (at ?me ?pos)
            (carry ?me)
            (delivery ?pos)
        )
        :effect (and
            (not (carry ?me))
        )
    )

    (:action pickup
        :parameters (?me ?pos ?p)
        :precondition (and
            (me ?me)
            (tile ?pos)
            (at ?me ?pos)
            (parcel ?p)
            (at ?p ?pos)
        )
        :effect (and
            (carry ?me)
            (not (at ?p ?pos))
        )
    )
)