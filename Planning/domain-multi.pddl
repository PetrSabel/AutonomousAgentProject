;; domain file: domain-multi.pddl
(define (domain default)
    (:requirements :strips :disjunctive-preconditions :negative-preconditions) ; :numeric-fluents
    (:predicates
        (me ?a)
        (friend ?a)
        (ally ?f)
        (carry ?me)
        (scored)
        
        (tile ?t)
        (delivery ?t)
        (free ?t)
        (spawn ?t)
        (withparcel ?t)
        
        (right ?t1 ?t2)
        (left ?t1 ?t2)
        (up ?t1 ?t2)
        (down ?t1 ?t2)
        (at ?agent ?tile)
    )
    
    (:functions
        (total-cost)
    )
    
    (:action right
        :parameters (?me ?from ?to)
        :precondition (and
            (ally ?me)
            (at ?me ?from)
            (right ?from ?to)
            (free ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
            (not (free ?to))
            (free ?from)
            ; (increase (total-cost) 1)
        )
    )

    (:action left
        :parameters (?me ?from ?to)
        :precondition (and
            (ally ?me)
            (at ?me ?from)
            (left ?from ?to)
            (free ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
            (not (free ?to))
            (free ?from)
            ; (increase (total-cost) 1)
        )
    )

    (:action up
        :parameters (?me ?from ?to)
        :precondition (and
            (ally ?me)
            (at ?me ?from)
            (up ?from ?to)
            (free ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
            (not (free ?to))
            (free ?from)
            ; (increase (total-cost) 1)
        )
    )

    (:action down
        :parameters (?me ?from ?to)
        :precondition (and
            (ally ?me)
            (at ?me ?from)
            (down ?from ?to)
            (free ?to)
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
            (not (free ?to))
            (free ?from)
            ; (increase (total-cost) 1)
        )
    )

    ;; Just put down 
    
    ;; Putdown and score points 
    (:action deliver
        :parameters (?me ?pos)
        :precondition (and
            (ally ?me)
            (tile ?pos)
            (at ?me ?pos)
            (carry ?me)
            (delivery ?pos)
        )
        :effect (and
            (not (carry ?me))
            (scored)
        )
    )

    (:action pickup
        :parameters (?me ?pos)
        :precondition (and
            (ally ?me)
            (tile ?pos)
            (at ?me ?pos)
            (withparcel ?pos)
        )
        :effect (and
            (carry ?me)
            (not (withparcel ?pos))
        )
    )
    
    (:action exchange
        :parameters (?me ?me_pos ?f ?f_pos)
        :precondition (and 
            (me ?me)
            (carry ?me)
            (ally ?f)
            (tile ?me_pos) (tile ?f_pos)
            (at ?me ?me_pos) (at ?f ?f_pos)
            (or 
                (left ?me_pos ?f_pos)
                (right ?me_pos ?f_pos)
                (down ?me_pos ?f_pos)
                (up ?me_pos ?f_pos)
            )
        )
        :effect (and 
            (not (carry ?me))
            (withparcel ?me_pos)
        )
    )
    
    (:action synch
        :parameters (?f)
        :precondition (and
            (friend ?f)
            (not (ally ?f))
            (not (me ?f))
        )
        :effect (and
            (ally ?f) 
        )
    )
)